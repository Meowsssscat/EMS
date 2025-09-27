# app.py

from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from supabase import create_client, Client
from datetime import datetime, timedelta, date
import os
from dotenv import load_dotenv
from werkzeug.security import check_password_hash, generate_password_hash
from functools import wraps
import calendar

# Load env
load_dotenv()

# Create Flask app
app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY')

# Supabase client
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Import and register blueprints AFTER app is created
from employee_management import employee_bp
from employee_attendance import employee_attendance_bp
from employee_leave import employee_leave_bp
from admin_attendance import admin_attendance_bp
from admin_leave_requests import leave_requests_bp
from admin_dashboard import init_admin_dashboard   # <-- use init function
from admin_dashboard_routes import admin_bp

app.register_blueprint(admin_bp)
app.register_blueprint(employee_bp)
app.register_blueprint(employee_attendance_bp)
app.register_blueprint(employee_leave_bp)
app.register_blueprint(admin_attendance_bp)
app.register_blueprint(leave_requests_bp)
init_admin_dashboard(app, supabase)  # <-- properly initializes admin dashboard

@app.route('/')
def home():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        try:
            response = supabase.table('employees').select('*').eq('email', email).execute()

            if response.data:
                user_data = response.data[0]

                if check_password_hash(user_data['password_hash'], password):
                    session['user_id'] = user_data['id']
                    session['user_email'] = email
                    session['user_role'] = user_data['role']
                    session['user_name'] = user_data['name']

                    if user_data['role'] == 'admin':
                        return redirect(url_for('admin_dashboard.dashboard'))  # ✅ will now work
                    else:
                        return redirect(url_for('employee_dashboard_full'))
                else:
                    flash('Invalid password')
            else:
                flash('User not found')

        except Exception as e:
            flash(f'Login failed: {str(e)}')
            print(f"Error details: {e}")  # Debugging info

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

def get_employee_data():
    """Get current employee data from database"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return None
            
        # Fetch complete employee data from database
        response = supabase.table('employees').select('*').eq('id', user_id).execute()
        
        if response.data:
            employee_data = response.data[0]
            name_parts = employee_data['name'].split()
            
            return {
                'employee_id': employee_data['id'],
                'first_name': name_parts[0] if name_parts else 'Employee',
                'last_name': name_parts[-1] if len(name_parts) > 1 else '',
                'full_name': employee_data['name'],
                'email': employee_data['email'],
                'phone': employee_data['phone'] or 'Not provided',
                'position': employee_data['position'] or 'Not assigned',
                'department': employee_data['department'] or 'Not assigned',
                'hire_date': employee_data['created_at'][:10] if employee_data['created_at'] else 'Unknown',
                'status': employee_data['status'] or 'Active',
                'image': employee_data.get('image', ''),
                'role': employee_data['role']
            }
        else:
            return None
            
    except Exception as e:
        print(f"Error fetching employee data: {e}")
        return None

def get_employee_statistics():
    """Get real employee statistics from Supabase - FIXED VERSION"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return default_stats()
            
        # Calculate attendance rate for current month
        current_month_start = datetime.now().replace(day=1).date()
        today = datetime.now().date()
        
        # Get attendance records for current month
        attendance_response = supabase.table('attendance').select('*').eq('employee_id', user_id).gte('date', current_month_start.isoformat()).lte('date', today.isoformat()).execute()
        
        # FIXED: Calculate working days correctly (inclusive of today)
        working_days = 0
        current_date = current_month_start
        while current_date <= today:
            if current_date.weekday() < 5:  # Monday = 0, Friday = 4
                working_days += 1
            current_date += timedelta(days=1)
        
        # FIXED: Count present days more accurately - debug what statuses you actually have
        present_days = len([a for a in attendance_response.data if a.get('status') in ['present', 'completed']])
        
        # DEBUG: Print actual data to see what's wrong
        print(f"DEBUG: Working days: {working_days}, Present days: {present_days}")
        print(f"DEBUG: Attendance data: {attendance_response.data}")
        
        # Calculate attendance rate
        attendance_rate = (present_days / working_days * 100) if working_days > 0 else 0
        
        # Get previous month for trend calculation
        prev_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        prev_month_end = current_month_start - timedelta(days=1)
        
        prev_attendance_response = supabase.table('attendance').select('*').eq('employee_id', user_id).gte('date', prev_month_start.isoformat()).lte('date', prev_month_end.isoformat()).execute()
        
        prev_working_days = 0
        current_date = prev_month_start
        while current_date <= prev_month_end:
            if current_date.weekday() < 5:
                prev_working_days += 1
            current_date += timedelta(days=1)
            
        prev_present_days = len([a for a in prev_attendance_response.data if a.get('status') in ['present', 'completed']])
        prev_attendance_rate = (prev_present_days / prev_working_days * 100) if prev_working_days > 0 else 0
        attendance_trend = round(attendance_rate - prev_attendance_rate, 1)
        
        # FIXED: Get leave balance with better debugging
        current_year = datetime.now().year
        total_allocated = 20  # Default annual leave
        
        leave_used_response = supabase.table('leave_requests').select('start_date, end_date, status, leave_type').eq('employee_id', user_id).eq('status', 'approved').gte('start_date', f'{current_year}-01-01').lte('end_date', f'{current_year}-12-31').execute()

        # DEBUG: Print leave data
        print(f"DEBUG: Leave requests: {leave_used_response.data}")
        
        total_used = 0
        if leave_used_response.data:
            for req in leave_used_response.data:
                try:
                    start_date = datetime.fromisoformat(req['start_date']).date()
                    end_date = datetime.fromisoformat(req['end_date']).date()
                    days = (end_date - start_date).days + 1
                    total_used += days
                    print(f"DEBUG: Leave request from {start_date} to {end_date} = {days} days")
                except Exception as date_error:
                    print(f"Error calculating days for leave request: {date_error}")
                    continue
        leave_balance = max(0, total_allocated - total_used)
        
        print(f"DEBUG: Total allocated: {total_allocated}, Total used: {total_used}, Balance: {leave_balance}")
        
        # Count pending requests
        pending_response = supabase.table('leave_requests').select('id').eq('employee_id', user_id).eq('status', 'pending').execute()
        pending_requests = len(pending_response.data) if pending_response.data else 0
        
        # Get department size
        employee_data = get_employee_data()
        department_size = 1
        if employee_data and employee_data.get('department'):
            dept_response = supabase.table('employees').select('id').eq('department', employee_data['department']).execute()
            department_size = len(dept_response.data) if dept_response.data else 1
        
        return {
            'attendance_rate': round(attendance_rate, 1),
            'attendance_trend': attendance_trend,
            'leave_balance': leave_balance,
            'total_leave_days': total_allocated,
            'pending_requests': pending_requests,
            'department_size': department_size
        }
        
    except Exception as e:
        print(f"Error calculating statistics: {e}")
        return default_stats()

def default_stats():
    """Default statistics when calculation fails"""
    return {
        'attendance_rate': 0,
        'attendance_trend': 0,
        'leave_balance': 20,
        'total_leave_days': 20,
        'pending_requests': 0,
        'department_size': 1
    }

def get_today_attendance():
    """Get real today's attendance from Supabase"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return None
            
        today = datetime.now().date().isoformat()
        
        response = supabase.table('attendance').select('*').eq('employee_id', user_id).eq('date', today).execute()
        
        if response.data:
            data = response.data[0]
            
            # Create attendance object
            class TodayAttendance:
                def __init__(self, attendance_data):
                    self.clock_in = None
                    self.clock_out = None
                    self.total_hours = 0.0
                    self.status = attendance_data.get('status', 'pending')
                    
                    # Parse clock in time
                    if attendance_data.get('clock_in_time'):
                        try:
                            self.clock_in = datetime.fromisoformat(attendance_data['clock_in_time'].replace('Z', ''))
                        except:
                            pass
                    
                    # Parse clock out time
                    if attendance_data.get('clock_out_time'):
                        try:
                            self.clock_out = datetime.fromisoformat(attendance_data['clock_out_time'].replace('Z', ''))
                        except:
                            pass
                    
                    # Calculate total hours
                    if self.clock_in and self.clock_out:
                        time_diff = self.clock_out - self.clock_in
                        self.total_hours = round(time_diff.total_seconds() / 3600, 2)
                    elif attendance_data.get('total_hours'):
                        self.total_hours = float(attendance_data['total_hours'])
            
            return TodayAttendance(data)
        
        return None
        
    except Exception as e:
        print(f"Error getting today's attendance: {e}")
        return None

def get_recent_leave_requests():
    """Get real recent leave requests from Supabase"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return []
            
        # The query should select the 'leave_type' column if it exists in the 'leave_requests' table.
        # It's good practice to explicitly select all necessary columns.
        response = supabase.table('leave_requests').select('id, start_date, end_date, status, leave_type').eq('employee_id', user_id).order('created_at', desc=True).limit(5).execute()
        
        if response.data:
            requests = []
            for req in response.data:
                # Create leave request object
                class LeaveRequest:
                    def __init__(self, data):
                        self.id = data['id']
                        self.start_date = datetime.fromisoformat(data['start_date']).date() if data.get('start_date') else None
                        self.end_date = datetime.fromisoformat(data['end_date']).date() if data.get('end_date') else None
                        self.status = data.get('status', 'pending')
                        self.leave_type = data.get('leave_type', 'Annual')  # <-- ADD THIS LINE
                        self.days = data.get('days', 1)
                        
                        # Calculate days from date range since 'days' column doesn't exist
                        if self.start_date and self.end_date:
                            self.days = (self.end_date - self.start_date).days + 1
                        else:
                            self.days = 1
                
                requests.append(LeaveRequest(req))
            
            return requests
            
        return []
        
    except Exception as e:
        print(f"Error getting leave requests: {e}")
        return []

# Update your existing employee/clock route
@app.route('/employee/clock', methods=['POST'])
@login_required
def employee_clock():
    """Enhanced employee clock in/out with real database storage"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        if not data or 'timestamp' not in data:
            return jsonify({'success': False, 'error': 'Missing timestamp'}), 400
        
        user_id = session['user_id']
        
        # Convert timestamp
        clock_time = datetime.fromisoformat(data['timestamp'].replace('Z', ''))
        today = clock_time.date().isoformat()
        
        # Check if attendance record exists for today
        attendance_response = supabase.table('attendance').select('*').eq('employee_id', user_id).eq('date', today).execute()
        
        if not attendance_response.data:
            # Create new attendance record for clock in
            attendance_data = {
                'employee_id': user_id,
                'date': today,
                'clock_in_time': clock_time.isoformat(),
                'status': 'present'
            }
            
            response = supabase.table('attendance').insert(attendance_data).execute()
            
            if response.data:
                # Create notification if notifications table exists
                try:
                    supabase.table('notifications').insert({
                        'employee_id': user_id,
                        'title': 'Clock In Successful',
                        'message': f'You clocked in at {clock_time.strftime("%I:%M %p")}',
                        'type': 'success',
                        'is_read': False,
                        'created_at': datetime.now().isoformat()
                    }).execute()
                except:
                    pass  # Notifications table might not exist
                
                return jsonify({
                    'success': True,
                    'action': 'clock_in',
                    'clock_in_time': clock_time.strftime('%I:%M %p'),
                    'message': f'Successfully clocked in at {clock_time.strftime("%I:%M %p")}'
                })
        
        else:
            # Update existing record for clock out
            attendance_record = attendance_response.data[0]
            
            if attendance_record.get('clock_in_time') and not attendance_record.get('clock_out_time'):
                # Calculate total hours
                clock_in_time = datetime.fromisoformat(attendance_record['clock_in_time'].replace('Z', ''))
                time_diff = clock_time - clock_in_time
                total_hours = round(time_diff.total_seconds() / 3600, 2)
                
                update_data = {
                    'clock_out_time': clock_time.isoformat(),
                    'total_hours': total_hours,
                    'status': 'completed'
                }
                
                response = supabase.table('attendance').update(update_data).eq('id', attendance_record['id']).execute()
                
                if response.data:
                    # Create notification
                    try:
                        supabase.table('notifications').insert({
                            'employee_id': user_id,
                            'title': 'Clock Out Successful',
                            'message': f'You clocked out at {clock_time.strftime("%I:%M %p")}. Total hours: {total_hours}',
                            'type': 'success',
                            'is_read': False,
                            'created_at': datetime.now().isoformat()
                        }).execute()
                    except:
                        pass
                    
                    return jsonify({
                        'success': True,
                        'action': 'clock_out',
                        'clock_out_time': clock_time.strftime('%I:%M %p'),
                        'total_hours': total_hours,
                        'message': f'Successfully clocked out at {clock_time.strftime("%I:%M %p")}'
                    })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Attendance already completed for today'
                }), 400
        
        return jsonify({'success': False, 'error': 'Failed to process request'}), 500
        
    except Exception as e:
        print(f"Clock error: {e}")
        return jsonify({'success': False, 'error': 'Clock operation failed'}), 500

def get_employee_stats():
    """Get real employee statistics from Supabase - FIXED VERSION for app.py"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return default_stats()
            
        # Calculate attendance rate for current month
        current_month_start = datetime.now().replace(day=1).date()
        today = datetime.now().date()
        
        # Get attendance records for current month
        try:
            attendance_response = supabase.table('attendance').select('*').eq('employee_id', user_id).gte('date', current_month_start.isoformat()).lte('date', today.isoformat()).execute()
        except:
            return default_stats()
        
        # FIXED: Calculate total days in the month (like your working attendance code)
        # For September: total days = 30 (regardless of what day today is)  
        import calendar
        _, total_days_in_month = calendar.monthrange(today.year, today.month)
        
        # Count present days
        present_days = len([a for a in attendance_response.data if a.get('status') in ['present', 'completed']])
        
        # FIXED: Calculate attendance rate based on total calendar days
        attendance_rate = (present_days / total_days_in_month * 100) if total_days_in_month > 0 else 0
        
        # FIXED: Get leave balance with debugging
        current_year = datetime.now().year
        total_allocated = 20  # Default annual leave
        
        try:
            leave_used_response = supabase.table('leave_requests').select('start_date, end_date, status').eq('employee_id', user_id).eq('status', 'approved').gte('start_date', f'{current_year}-01-01').lte('end_date', f'{current_year}-12-31').execute()
            
            total_used = 0
            if leave_used_response.data:
                for req in leave_used_response.data:
                    try:
                        start_date = datetime.fromisoformat(req['start_date']).date()
                        end_date = datetime.fromisoformat(req['end_date']).date()
                        days = (end_date - start_date).days + 1
                        total_used += days
                    except Exception as date_error:
                        print(f"Error calculating days for leave request: {date_error}")
                        continue
        except Exception as leave_error:
            print(f"Leave query error: {leave_error}")
            total_used = 0
        
        leave_balance = max(0, total_allocated - total_used)
        
        # Count pending requests
        try:
            pending_response = supabase.table('leave_requests').select('id').eq('employee_id', user_id).eq('status', 'pending').execute()
            pending_requests = len(pending_response.data) if pending_response.data else 0
        except:
            pending_requests = 0
        
        # Get department size
        employee_data = get_employee_data()
        department_size = 1
        if employee_data and employee_data.get('department'):
            try:
                dept_response = supabase.table('employees').select('id').eq('department', employee_data['department']).execute()
                department_size = len(dept_response.data) if dept_response.data else 1
            except:
                pass
        
        return {
            'attendance_rate': round(attendance_rate, 1),
            'attendance_trend': 0,  # Will calculate later when we have more data
            'leave_balance': leave_balance,
            'total_leave_days': total_allocated,
            'pending_requests': pending_requests,
            'department_size': department_size
        }
        
    except Exception as e:
        print(f"Error calculating statistics: {e}")
        return default_stats()

# Employee Dashboard Routes
@app.route('/employee')
@login_required
def employee_dashboard_simple():
    """Simple employee redirect"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('employee_dashboard_full'))

@app.route('/employee/dashboard')
@login_required
def employee_dashboard_full():
    """Full employee dashboard with all data"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    try:
        employee = get_employee_data()
        if not employee:
            flash('Employee profile not found')
            return redirect(url_for('login'))
            
        employee_stats = get_employee_stats()
        today_attendance = get_today_attendance()
        recent_leave_requests = get_recent_leave_requests()

        
        return render_template('employee_dashboard.html',
                             employee=employee,
                             employee_stats=employee_stats,
                             today_attendance=today_attendance,
                             recent_leave_requests=recent_leave_requests)
    except Exception as e:
        print(f"Error loading employee dashboard: {e}")
        return "Error loading dashboard", 500

@app.route('/employee/dashboard-data')
@login_required
def employee_dashboard_data():
    """Get fresh dashboard data"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        return jsonify({
            'success': True,
            'stats': get_employee_stats(),
            'today_attendance': get_today_attendance(),
            'recent_leave_requests': get_recent_leave_requests(),
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        print(f"Dashboard data error: {e}")
        return jsonify({'success': False, 'error': 'Failed to fetch data'}), 500

from employee_profile_modal import create_profile_route_handler

@app.route('/employee/profile-data')
@login_required
def employee_profile_data():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    handler = create_profile_route_handler(supabase)
    return handler()

@app.route('/employee/profile')
@login_required
def employee_profile_page():
    """Employee profile page - view only"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    try:
        employee = get_employee_data()
        if not employee:
            flash('Employee profile not found')
            return redirect(url_for('employee_dashboard_full'))
        
        return render_template('employee_profile.html', employee=employee)
        
    except Exception as e:
        print(f"Error loading employee profile page: {e}")
        flash('Error loading profile page')
        return redirect(url_for('employee_dashboard_full'))

# Custom Jinja2 filter for date parsing
def strptime_filter(date_string, format_string):
    """Parse date string using strptime"""
    try:
        return datetime.strptime(date_string, format_string)
    except (ValueError, TypeError):
        return None

def strftime_filter(date_obj, format_string):
    """Format date object using strftime"""
    try:
        if isinstance(date_obj, str):
            # If it's a string, try to parse it first
            date_obj = datetime.strptime(date_obj, '%Y-%m-%d')
        return date_obj.strftime(format_string)
    except (ValueError, TypeError, AttributeError):
        return date_obj  # Return original if formatting fails

# Register the custom filters
app.jinja_env.filters['strptime'] = strptime_filter
app.jinja_env.filters['strftime'] = strftime_filter

# Also add a helper filter for date formatting that's commonly needed
def format_date(date_string, input_format='%Y-%m-%d', output_format='%B %d, %Y'):
    """Convert date string from one format to another"""
    try:
        if isinstance(date_string, str):
            date_obj = datetime.strptime(date_string, input_format)
            return date_obj.strftime(output_format)
        return date_string
    except (ValueError, TypeError):
        return date_string

app.jinja_env.filters['format_date'] = format_date

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
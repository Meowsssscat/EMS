# employee_dashboard.py

from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for, flash, current_app
from datetime import datetime, timedelta, date
from functools import wraps
import calendar

# Create employee blueprint
employee_bp = Blueprint('employee_dashboard', __name__, url_prefix='/employee')

def employee_required(f):
    """Decorator to require employee authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        
        # Check if user role is employee or admin (admin can access employee features)
        user_role = session.get('user_role', '')
        if user_role not in ['employee', 'admin']:
            flash('Access denied. Employee access required.')
            return redirect(url_for('login'))
        
        return f(*args, **kwargs)
    return decorated_function

def login_required(f):
    """Login required decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def get_supabase_client():
    """Get Supabase client from Flask app"""
    if hasattr(current_app, 'supabase'):
        return current_app.supabase
    # Fallback - import from main module
    try:
        from app import supabase
        return supabase
    except ImportError:
        print("Error: Could not get Supabase client")
        return None

@employee_bp.route('/dashboard')
@login_required
@employee_required
def dashboard():
    """Employee dashboard main page"""
    try:
        # Get employee statistics
        employee_stats = get_employee_statistics_supabase()
        
        # Get today's attendance
        today_attendance = get_today_attendance_supabase()
        
        # Get recent leave requests (last 5)
        recent_leave_requests = get_recent_leave_requests_supabase(limit=5)
        
        return render_template('employee_dashboard.html',
                             employee_stats=employee_stats,
                             today_attendance=today_attendance,
                             recent_leave_requests=recent_leave_requests)
    
    except Exception as e:
        print(f"Error loading employee dashboard: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return render_template('error.html', 
                             error_message="Unable to load dashboard. Please try again.")

@employee_bp.route('/dashboard-data')
@login_required
@employee_required
def dashboard_data():
    """API endpoint to get updated dashboard data"""
    try:
        # Get fresh data
        employee_stats = get_employee_statistics_supabase()
        today_attendance = get_today_attendance_supabase()
        recent_leave_requests = get_recent_leave_requests_supabase(limit=5)
        
        # Format data for JSON response
        response_data = {
            'success': True,
            'employee_stats': employee_stats,
            'today_attendance': format_attendance_for_json(today_attendance),
            'recent_leave_requests': format_leave_requests_for_json(recent_leave_requests),
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(response_data)
    
    except Exception as e:
        print(f"Error getting dashboard data: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Unable to fetch dashboard data'
        }), 500

@employee_bp.route('/clock', methods=['POST'])
@login_required
@employee_required
def clock_in_out():
    """Handle clock in/out requests using Supabase"""
    try:
        data = request.get_json()
        if not data or 'timestamp' not in data:
            return jsonify({
                'success': False,
                'error': 'Invalid request data'
            }), 400
        
        user_id = session['user_id']
        supabase = get_supabase_client()
        
        if not supabase:
            return jsonify({
                'success': False,
                'error': 'Database connection failed'
            }), 500
        
        # Parse timestamp
        try:
            clock_time = datetime.fromisoformat(data['timestamp'].replace('Z', ''))
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Invalid timestamp format'
            }), 400
        
        # Get today's attendance record
        today = clock_time.date().isoformat()
        
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

def get_employee_statistics_supabase():
    """Get comprehensive employee statistics using Supabase"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return default_stats()
        
        supabase = get_supabase_client()
        if not supabase:
            return default_stats()
        
        # Calculate attendance rate for current month
        current_month_start = date.today().replace(day=1)
        today = date.today()
        
        # Calculate total days in the month
        _, total_days_in_month = calendar.monthrange(today.year, today.month)
        
        # Get attendance records for current month
        attendance_response = supabase.table('attendance').select('*').eq('employee_id', user_id).gte('date', current_month_start.isoformat()).lte('date', today.isoformat()).execute()
        
        # Count present days
        present_days = len([a for a in attendance_response.data if a.get('status') in ['present', 'completed']])
        
        # Calculate attendance rate
        attendance_rate = (present_days / total_days_in_month * 100) if total_days_in_month > 0 else 0
        
        # Get leave balance
        leave_balance = get_leave_balance_supabase()
        
        # Count pending requests
        pending_response = supabase.table('leave_requests').select('id').eq('employee_id', user_id).eq('status', 'pending').execute()
        pending_requests = len(pending_response.data) if pending_response.data else 0
        
        # Get department size
        employee_response = supabase.table('employees').select('department').eq('id', user_id).execute()
        department = None
        if employee_response.data:
            department = employee_response.data[0].get('department')
        
        department_size = 1
        if department:
            dept_response = supabase.table('employees').select('id').eq('department', department).execute()
            department_size = len(dept_response.data) if dept_response.data else 1
        
        return {
            'attendance_rate': round(attendance_rate, 1),
            'attendance_trend': 0,  # Calculate if needed
            'leave_balance': leave_balance,
            'total_leave_days': 20,  # Default allocation
            'pending_requests': pending_requests,
            'department_size': department_size
        }
        
    except Exception as e:
        print(f"Error calculating employee statistics: {str(e)}")
        return default_stats()

def get_today_attendance_supabase():
    """Get today's attendance record using Supabase"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return None
        
        supabase = get_supabase_client()
        if not supabase:
            return None
            
        today = date.today().isoformat()
        
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

def get_recent_leave_requests_supabase(limit=5):
    """Get recent leave requests using Supabase"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return []
        
        supabase = get_supabase_client()
        if not supabase:
            return []
        
        response = supabase.table('leave_requests').select('id, start_date, end_date, status, leave_type').eq('employee_id', user_id).order('created_at', desc=True).limit(limit).execute()
        
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
                        # Create a mock leave_type object
                        self.leave_type = type('LeaveType', (), {'name': data.get('leave_type', 'Annual')})()
                        
                        # Calculate days from date range
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

def get_leave_balance_supabase():
    """Calculate current leave balance using Supabase"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return 20  # Default
        
        supabase = get_supabase_client()
        if not supabase:
            return 20
        
        # Get current year
        current_year = datetime.now().year
        total_allocated = 20
        
        # Get used leave days this year
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
        
        return max(0, total_allocated - total_used)
        
    except Exception as e:
        print(f"Error calculating leave balance: {e}")
        return 20  # Default

def format_attendance_for_json(attendance):
    """Format attendance object for JSON response"""
    if not attendance:
        return {
            'clock_in': None,
            'clock_out': None,
            'total_hours': 0.0,
            'status': 'not_clocked_in'
        }
    
    return {
        'clock_in': attendance.clock_in.isoformat() if attendance.clock_in else None,
        'clock_out': attendance.clock_out.isoformat() if attendance.clock_out else None,
        'total_hours': float(attendance.total_hours) if attendance.total_hours else 0.0,
        'status': attendance.status
    }

def format_leave_requests_for_json(requests):
    """Format leave requests for JSON response"""
    return [{
        'id': req.id,
        'leave_type': req.leave_type.name,
        'start_date': req.start_date.isoformat() if req.start_date else None,
        'end_date': req.end_date.isoformat() if req.end_date else None,
        'status': req.status,
        'days': req.days
    } for req in requests]

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

# Additional routes for employee functionality

@employee_bp.route('/attendance')
@login_required
@employee_required
def attendance():
    """Employee attendance history page"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return redirect(url_for('login'))
        
        supabase = get_supabase_client()
        if not supabase:
            return render_template('error.html', error_message="Database connection failed")
        
        # Get attendance history for current month by default
        current_month_start = date.today().replace(day=1)
        
        # Get filter parameters from query string
        start_date = request.args.get('start_date', current_month_start.strftime('%Y-%m-%d'))
        end_date = request.args.get('end_date', date.today().strftime('%Y-%m-%d'))
        
        # Parse dates
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            start_date = current_month_start
            end_date = date.today()
        
        # Get attendance records from Supabase
        attendance_response = supabase.table('attendance').select('*').eq('employee_id', user_id).gte('date', start_date.isoformat()).lte('date', end_date.isoformat()).order('date', desc=True).execute()
        
        attendance_records = []
        if attendance_response.data:
            for record in attendance_response.data:
                # Create attendance object
                class AttendanceRecord:
                    def __init__(self, data):
                        self.date = datetime.fromisoformat(data['date']).date()
                        self.status = data.get('status', 'absent')
                        self.clock_in = None
                        self.clock_out = None
                        self.total_hours = data.get('total_hours', 0)
                        
                        if data.get('clock_in_time'):
                            try:
                                self.clock_in = datetime.fromisoformat(data['clock_in_time'].replace('Z', ''))
                            except:
                                pass
                        
                        if data.get('clock_out_time'):
                            try:
                                self.clock_out = datetime.fromisoformat(data['clock_out_time'].replace('Z', ''))
                            except:
                                pass
                
                attendance_records.append(AttendanceRecord(record))
        
        # Calculate summary statistics
        total_days = len(attendance_records)
        present_days = len([a for a in attendance_records if a.status in ['present', 'completed']])
        late_days = len([a for a in attendance_records if a.status == 'late'])
        absent_days = total_days - present_days
        total_hours = sum([float(a.total_hours) for a in attendance_records if a.total_hours]) or 0
        
        summary = {
            'total_days': total_days,
            'present_days': present_days,
            'late_days': late_days,
            'absent_days': absent_days,
            'total_hours': round(total_hours, 2),
            'attendance_rate': round((present_days / total_days * 100) if total_days > 0 else 0, 1)
        }
        
        return render_template('employee_attendance.html',
                             attendance_records=attendance_records,
                             summary=summary,
                             start_date=start_date,
                             end_date=end_date)
    
    except Exception as e:
        print(f"Error loading attendance page: {str(e)}")
        return render_template('error.html',
                             error_message="Unable to load attendance data.")

@employee_bp.route('/profile')
@login_required
@employee_required
def profile():
    """Employee profile page"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return redirect(url_for('login'))
        
        supabase = get_supabase_client()
        if not supabase:
            return render_template('error.html', error_message="Database connection failed")
        
        # Get employee data
        employee_response = supabase.table('employees').select('*').eq('id', user_id).execute()
        
        if employee_response.data:
            employee_data = employee_response.data[0]
            return render_template('employee_profile.html', employee=employee_data)
        else:
            return render_template('error.html', error_message="Employee profile not found")
    
    except Exception as e:
        print(f"Error loading profile page: {str(e)}")
        return render_template('error.html',
                             error_message="Unable to load profile data.")

# Error handlers for employee blueprint
@employee_bp.errorhandler(404)
def employee_not_found(error):
    """Handle 404 errors in employee section"""
    return render_template('error.html',
                         error_message="Page not found in employee section."), 404

@employee_bp.errorhandler(500)
def employee_server_error(error):
    """Handle 500 errors in employee section"""
    print(f"Employee section server error: {str(error)}")
    return render_template('error.html',
                         error_message="Internal server error. Please try again."), 500
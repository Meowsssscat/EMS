from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from supabase import create_client, Client
from datetime import datetime
import os
from dotenv import load_dotenv
from werkzeug.security import check_password_hash, generate_password_hash

# Load env
load_dotenv()

# Create Flask app
app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY')

# Supabase client
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

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


# Helper functions for employee data
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
                'image': employee_data['image'],  # This is the profile image URL
                'role': employee_data['role']
            }
        else:
            return None
            
    except Exception as e:
        print(f"Error fetching employee data: {e}")
        return None

def get_employee_stats():
    """Get employee dashboard statistics"""
    return {
        'attendance_rate': 95,
        'leave_balance': 15,
        'pending_requests': 1,
        'team_size': 12
    }

def get_today_attendance():
    """Get today's attendance for employee"""
    return {
        'clock_in': None,  # Will be updated via JavaScript
        'clock_out': None,
        'total_hours': '0.0',
        'status': 'Not Clocked In'
    }

def get_recent_leave_requests():
    """Get recent leave requests"""
    return [
        {
            'leave_type': 'Annual Leave',
            'start_date': '2025-03-15',
            'end_date': '2025-03-17',
            'status': 'Pending'
        },
        {
            'leave_type': 'Sick Leave',
            'start_date': '2025-03-10',
            'end_date': '2025-03-10',
            'status': 'Approved'
        }
    ]

# Employee Dashboard Routes
@app.route('/employee')
def employee_dashboard_simple():
    """Simple employee redirect"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('employee_dashboard_full'))

@app.route('/employee/dashboard')
def employee_dashboard_full():
    """Full employee dashboard with all data"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    try:
        employee = get_employee_data()
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

@app.route('/employee/clock', methods=['POST'])
def employee_clock():
    """Handle employee clock in/out"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        action = data.get('action')
        timestamp = data.get('timestamp')
        
        if not action or not timestamp:
            return jsonify({'success': False, 'error': 'Missing parameters'}), 400
        
        # Convert timestamp
        clock_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        time_str = clock_time.strftime('%I:%M %p')
        
        # TODO: Save to database here using supabase
        # Example:
        # supabase.table('attendance').insert({
        #     'employee_id': session['user_id'],
        #     'action': action,
        #     'timestamp': clock_time.isoformat(),
        #     'date': clock_time.date().isoformat()
        # }).execute()
        
        response = {
            'success': True,
            'action': action,
            'timestamp': time_str,
            'message': f'Successfully {action.replace("_", " ")} at {time_str}'
        }
        
        if action == 'clock_out':
            response['total_hours'] = 8.0  # Mock calculation
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Clock error: {e}")
        return jsonify({'success': False, 'error': 'Clock operation failed'}), 500

@app.route('/employee/dashboard-data')
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
def employee_profile_data():
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    handler = create_profile_route_handler(supabase)
    return handler()





@app.route('/employee/profile')
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


# Add this to your app.py file after creating the Flask app but before the routes



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
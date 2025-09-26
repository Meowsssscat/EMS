from flask import Blueprint, render_template, session, redirect, url_for, jsonify
from supabase import Client
from datetime import datetime, timedelta
from collections import defaultdict
import calendar

# Create the blueprint first
admin_dashboard_bp = Blueprint('admin_dashboard', __name__, url_prefix='/admin')

# Global variable to hold the supabase client
_supabase_client = None

def get_total_employees():
    """Get total number of employees (excluding admins)"""
    try:
        response = _supabase_client.table('employees').select('id', count='exact').eq('role', 'employee').execute()
        return response.count if response.count else 0
    except Exception as e:
        print(f"Error getting total employees: {e}")
        return 0

def get_attendance_today():
    """Get attendance count for today (excluding admins)"""
    try:
        today = datetime.now().date()
        
        # Get all employees (excluding admins) and their attendance for today
        employees_response = _supabase_client.table('employees').select('id').eq('role', 'employee').execute()
        employee_ids = [emp['id'] for emp in employees_response.data] if employees_response.data else []
        
        if not employee_ids:
            return 0
        
        # Count present attendance for today
        attendance_response = _supabase_client.table('attendance').select('id', count='exact').eq('date', str(today)).eq('status', 'present').in_('employee_id', employee_ids).execute()
        return attendance_response.count if attendance_response.count else 0
    except Exception as e:
        print(f"Error getting today's attendance: {e}")
        return 0

def get_pending_leave_requests():
    """Get count of pending leave requests"""
    try:
        # Get employees (excluding admins)
        employees_response = _supabase_client.table('employees').select('id').eq('role', 'employee').execute()
        employee_ids = [emp['id'] for emp in employees_response.data] if employees_response.data else []
        
        if not employee_ids:
            return 0
        
        response = _supabase_client.table('leave_requests').select('id', count='exact').eq('status', 'pending').in_('employee_id', employee_ids).execute()
        return response.count if response.count else 0
    except Exception as e:
        print(f"Error getting pending leave requests: {e}")
        return 0

def get_overall_attendance_rate():
    """Calculate overall attendance rate for employees (excluding admins) for current month"""
    try:
        # Get all employees (excluding admins)
        employees_response = _supabase_client.table('employees').select('id').eq('role', 'employee').execute()
        employee_ids = [emp['id'] for emp in employees_response.data] if employees_response.data else []
        
        if not employee_ids:
            return 0.0
        
        # Get current month's working days (excluding weekends)
        today = datetime.now()
        first_day_of_month = today.replace(day=1)
        working_days = 0
        current_date = first_day_of_month
        
        while current_date <= today:
            if current_date.weekday() < 5:  # Monday to Friday
                working_days += 1
            current_date += timedelta(days=1)
        
        if working_days == 0:
            return 0.0
        
        # Count total present days for all employees this month
        total_present_response = _supabase_client.table('attendance').select('id', count='exact').gte('date', str(first_day_of_month.date())).lte('date', str(today.date())).eq('status', 'present').in_('employee_id', employee_ids).execute()
        total_present = total_present_response.count if total_present_response.count else 0
        
        total_possible = len(employee_ids) * working_days
        
        if total_possible == 0:
            return 0.0
        
        return round((total_present / total_possible) * 100, 1)
    except Exception as e:
        print(f"Error calculating attendance rate: {e}")
        return 0.0

def get_employee_of_the_month():
    """Get employee with highest present count this month (excluding admins)"""
    try:
        # Get current month date range
        today = datetime.now()
        first_day_of_month = today.replace(day=1)
        
        # Get all employees (excluding admins)
        employees_response = _supabase_client.table('employees').select('id, name').eq('role', 'employee').execute()
        employees = {emp['id']: emp['name'] for emp in employees_response.data} if employees_response.data else {}
        
        if not employees:
            return {'name': 'No Data', 'present_count': 0}
        
        # Get attendance data for this month
        attendance_response = _supabase_client.table('attendance').select('employee_id').gte('date', str(first_day_of_month.date())).lte('date', str(today.date())).eq('status', 'present').in_('employee_id', list(employees.keys())).execute()
        
        if not attendance_response.data:
            return {'name': 'No Data', 'present_count': 0}
        
        # Count present days per employee
        present_counts = defaultdict(int)
        for record in attendance_response.data:
            present_counts[record['employee_id']] += 1
        
        if not present_counts:
            return {'name': 'No Data', 'present_count': 0}
        
        # Find employee with highest count
        best_employee_id = max(present_counts, key=present_counts.get)
        best_count = present_counts[best_employee_id]
        
        return {
            'name': employees.get(best_employee_id, 'Unknown'),
            'present_count': best_count
        }
    except Exception as e:
        print(f"Error getting employee of the month: {e}")
        return {'name': 'No Data', 'present_count': 0}

def get_monthly_leave_trends():
    """Get monthly leave request trends for the current month (daily breakdown)"""
    try:
        # Get employees (excluding admins)
        employees_response = _supabase_client.table('employees').select('id').eq('role', 'employee').execute()
        employee_ids = [emp['id'] for emp in employees_response.data] if employees_response.data else []
        
        if not employee_ids:
            return []
        
        # Get current month date range
        today = datetime.now()
        first_day_of_month = today.replace(day=1)
        
        # Get leave requests for the current month
        leave_response = _supabase_client.table('leave_requests').select('created_at').gte('created_at', first_day_of_month.isoformat()).lte('created_at', today.isoformat()).in_('employee_id', employee_ids).execute()
        
        # Group by day
        daily_counts = defaultdict(int)
        if leave_response.data:
            for record in leave_response.data:
                # Handle different datetime formats
                created_at_str = record['created_at']
                if created_at_str.endswith('Z'):
                    created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                elif '+' in created_at_str:
                    created_at = datetime.fromisoformat(created_at_str)
                else:
                    created_at = datetime.fromisoformat(created_at_str + '+00:00')
                
                day_key = created_at.strftime('%Y-%m-%d')
                daily_counts[day_key] += 1
        
        # Generate data for each day of the current month up to today
        result = []
        current_date = first_day_of_month
        
        while current_date <= today:
            day_key = current_date.strftime('%Y-%m-%d')
            day_label = current_date.strftime('%d')  # Just the day number
            count = daily_counts.get(day_key, 0)
            
            result.append({
                'day': day_label,
                'count': count,
                'date': day_key  # Keep full date for reference
            })
            
            current_date += timedelta(days=1)
        
        return result
    except Exception as e:
        print(f"Error getting monthly leave trends: {e}")
        # Return empty data for current month as fallback
        result = []
        today = datetime.now()
        first_day_of_month = today.replace(day=1)
        current_date = first_day_of_month
        
        while current_date <= today:
            day_label = current_date.strftime('%d')
            result.append({
                'day': day_label,
                'count': 0,
                'date': current_date.strftime('%Y-%m-%d')
            })
            current_date += timedelta(days=1)
        
        return result

def get_attendance_trends():
    """Get daily attendance trends for the current month"""
    try:
        # Get employees (excluding admins)
        employees_response = _supabase_client.table('employees').select('id').eq('role', 'employee').execute()
        employee_ids = [emp['id'] for emp in employees_response.data] if employees_response.data else []
        
        if not employee_ids:
            return []
        
        # Get current month date range
        today = datetime.now()
        first_day_of_month = today.replace(day=1)
        
        # Get attendance data for the current month
        attendance_response = _supabase_client.table('attendance').select('date, status').gte('date', str(first_day_of_month.date())).lte('date', str(today.date())).in_('employee_id', employee_ids).execute()
        
        # Group by date and count present
        daily_counts = defaultdict(int)
        total_employees = len(employee_ids)
        
        if attendance_response.data:
            for record in attendance_response.data:
                if record['status'] == 'present':
                    daily_counts[record['date']] += 1
        
        # Generate daily data for the current month up to today
        result = []
        current_date = first_day_of_month.date()
        
        while current_date <= today.date():
            # Only include weekdays for attendance tracking
            if current_date.weekday() < 5:  # Monday to Friday
                present_count = daily_counts.get(str(current_date), 0)
                attendance_rate = (present_count / total_employees * 100) if total_employees > 0 else 0
                
                result.append({
                    'date': current_date.strftime('%m/%d'),  # MM/DD format
                    'day': current_date.strftime('%d'),      # Just day number
                    'rate': round(attendance_rate, 1),
                    'present_count': present_count,
                    'total_employees': total_employees,
                    'full_date': str(current_date)  # Keep full date for reference
                })
            
            current_date += timedelta(days=1)
        
        return result
    except Exception as e:
        print(f"Error getting attendance trends: {e}")
        return []

# Define routes BEFORE registration
@admin_dashboard_bp.route('/dashboard')
def dashboard():
    """Admin dashboard route"""
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return redirect(url_for('login'))
    
    try:
        # Gather all KPI data
        dashboard_data = {
            'total_employees': get_total_employees(),
            'attendance_today': get_attendance_today(),
            'pending_leave_requests': get_pending_leave_requests(),
            'overall_attendance_rate': get_overall_attendance_rate(),
            'employee_of_month': get_employee_of_the_month(),
            'monthly_leave_trends': get_monthly_leave_trends(),
            'attendance_trends': get_attendance_trends(),
            'current_month': datetime.now().strftime('%B %Y')  # Add current month name
        }
        
        return render_template('admin_dashboard.html', **dashboard_data)
    except Exception as e:
        print(f"Error loading admin dashboard: {e}")
        # Return a fallback response with default values instead of error 500
        default_data = {
            'total_employees': 0,
            'attendance_today': 0,
            'pending_leave_requests': 0,
            'overall_attendance_rate': 0.0,
            'employee_of_month': {'name': 'No Data', 'present_count': 0},
            'monthly_leave_trends': [],
            'attendance_trends': [],
            'current_month': datetime.now().strftime('%B %Y')
        }
        return render_template('admin_dashboard.html', **default_data)

@admin_dashboard_bp.route('/dashboard/api/data')
def dashboard_api():
    """API endpoint for dashboard data (for AJAX updates)"""
    if 'user_id' not in session or session.get('user_role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = {
            'total_employees': get_total_employees(),
            'attendance_today': get_attendance_today(),
            'pending_leave_requests': get_pending_leave_requests(),
            'overall_attendance_rate': get_overall_attendance_rate(),
            'employee_of_month': get_employee_of_the_month(),
            'monthly_leave_trends': get_monthly_leave_trends(),
            'attendance_trends': get_attendance_trends(),
            'current_month': datetime.now().strftime('%B %Y'),
            'timestamp': datetime.now().isoformat()
        }
        return jsonify(data)
    except Exception as e:
        print(f"Error getting dashboard API data: {e}")
        # Return default data instead of error
        default_data = {
            'total_employees': 0,
            'attendance_today': 0,
            'pending_leave_requests': 0,
            'overall_attendance_rate': 0.0,
            'employee_of_month': {'name': 'No Data', 'present_count': 0},
            'monthly_leave_trends': [],
            'attendance_trends': [],
            'current_month': datetime.now().strftime('%B %Y'),
            'timestamp': datetime.now().isoformat()
        }
        return jsonify(default_data)

def init_admin_dashboard(app, supabase: Client):
    """Initialize admin dashboard with Flask app and supabase client"""
    global _supabase_client
    _supabase_client = supabase
    
    # Register the blueprint with the app (routes are already defined above)
    app.register_blueprint(admin_dashboard_bp)
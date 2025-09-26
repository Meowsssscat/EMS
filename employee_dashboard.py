"""
Employee Dashboard Routes for Flask EMS
Handles all employee-facing dashboard functionality
"""

from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from datetime import datetime, timedelta
from functools import wraps
import json

# Create employee blueprint
employee_bp = Blueprint('employee', __name__, url_prefix='/employee')

def employee_required(f):
    """Decorator to require employee authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('user_type') != 'employee':
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def get_current_employee():
    """Get current employee data from session"""
    # This would typically fetch from database using session['user_id']
    # For now, return mock data
    return {
        'employee_id': 'EMP001',
        'first_name': 'John',
        'last_name': 'Doe',
        'email': 'john.doe@company.com',
        'phone': '+1 (555) 123-4567',
        'position': 'Software Developer',
        'department': 'Information Technology',
        'hire_date': '2024-01-15',
        'status': 'Active'
    }

def get_employee_stats():
    """Get employee statistics"""
    # This would typically fetch from database
    # For now, return mock data
    return {
        'attendance_rate': 95,
        'leave_balance': 15,
        'pending_requests': 1,
        'team_size': 12
    }

def get_today_attendance():
    """Get today's attendance data for current employee"""
    # This would typically fetch from database
    # For now, return mock data based on current time
    current_time = datetime.now()
    
    # Mock data - in real implementation, this would come from database
    return {
        'clock_in': '09:15 AM',
        'clock_out': None,  # Not clocked out yet
        'total_hours': '0.0',
        'status': 'Present'
    }

def get_recent_leave_requests():
    """Get recent leave requests for current employee"""
    # This would typically fetch from database
    # For now, return mock data
    return [
        {
            'id': 1,
            'leave_type': 'Annual Leave',
            'start_date': '2025-03-15',
            'end_date': '2025-03-17',
            'status': 'Pending',
            'submitted_date': '2025-03-01'
        },
        {
            'id': 2,
            'leave_type': 'Sick Leave',
            'start_date': '2025-03-10',
            'end_date': '2025-03-10',
            'status': 'Approved',
            'submitted_date': '2025-03-09'
        }
    ]

@employee_bp.route('/dashboard')
@employee_required
def dashboard():
    """Employee dashboard main page"""
    try:
        # Get employee data
        employee = get_current_employee()
        employee_stats = get_employee_stats()
        today_attendance = get_today_attendance()
        recent_leave_requests = get_recent_leave_requests()
        
        return render_template('employee_dashboard.html',
                             employee=employee,
                             employee_stats=employee_stats,
                             today_attendance=today_attendance,
                             recent_leave_requests=recent_leave_requests)
    
    except Exception as e:
        print(f"Error loading employee dashboard: {str(e)}")
        return render_template('error.html', 
                             error_message="Unable to load dashboard. Please try again.")

@employee_bp.route('/dashboard-data')
@employee_required
def dashboard_data():
    """API endpoint to get updated dashboard data"""
    try:
        # Get fresh data
        employee_stats = get_employee_stats()
        today_attendance = get_today_attendance()
        recent_leave_requests = get_recent_leave_requests()
        
        return jsonify({
            'success': True,
            'stats': employee_stats,
            'today_attendance': today_attendance,
            'recent_leave_requests': recent_leave_requests,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        print(f"Error getting dashboard data: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Unable to fetch dashboard data'
        }), 500

@employee_bp.route('/clock', methods=['POST'])
@employee_required
def clock_in_out():
    """Handle clock in/out requests"""
    try:
        data = request.get_json()
        action = data.get('action')  # 'clock_in' or 'clock_out'
        timestamp = data.get('timestamp')
        
        if not action or not timestamp:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters'
            }), 400
        
        # Convert timestamp string to datetime object
        clock_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        
        # In a real application, this would:
        # 1. Validate the employee can clock in/out
        # 2. Check for existing attendance records
        # 3. Store the attendance record in database
        # 4. Calculate total hours if clocking out
        
        # Mock response
        employee_id = session.get('user_id')
        
        if action == 'clock_in':
            # Store clock in time (in real app, this would go to database)
            response_data = {
                'success': True,
                'action': 'clock_in',
                'timestamp': clock_time.strftime('%I:%M %p'),
                'message': f'Successfully clocked in at {clock_time.strftime("%I:%M %p")}'
            }
        
        elif action == 'clock_out':
            # Store clock out time and calculate hours
            response_data = {
                'success': True,
                'action': 'clock_out',
                'timestamp': clock_time.strftime('%I:%M %p'),
                'total_hours': 8.0,  # Mock calculation
                'message': f'Successfully clocked out at {clock_time.strftime("%I:%M %p")}'
            }
        
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid action'
            }), 400
        
        return jsonify(response_data)
    
    except Exception as e:
        print(f"Error processing clock request: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Unable to process clock request'
        }), 500

@employee_bp.route('/attendance')
@employee_required
def attendance():
    """Employee attendance page (placeholder)"""
    try:
        employee = get_current_employee()
        
        # In a real application, this would fetch attendance history from database
        attendance_history = [
            {
                'date': '2025-03-20',
                'clock_in': '09:15 AM',
                'clock_out': '05:30 PM',
                'total_hours': 8.25,
                'status': 'Present'
            },
            {
                'date': '2025-03-19',
                'clock_in': '09:00 AM',
                'clock_out': '05:15 PM',
                'total_hours': 8.25,
                'status': 'Present'
            },
            {
                'date': '2025-03-18',
                'clock_in': '09:30 AM',
                'clock_out': '05:45 PM',
                'total_hours': 8.25,
                'status': 'Late'
            }
        ]
        
        return render_template('employee_attendance.html',
                             employee=employee,
                             attendance_history=attendance_history)
    
    except Exception as e:
        print(f"Error loading attendance page: {str(e)}")
        return render_template('error.html',
                             error_message="Unable to load attendance data.")

@employee_bp.route('/leave-request', methods=['GET', 'POST'])
@employee_required
def leave_request():
    """Employee leave request page"""
    try:
        employee = get_current_employee()
        
        if request.method == 'POST':
            # Handle leave request submission
            leave_type = request.form.get('leave_type')
            start_date = request.form.get('start_date')
            end_date = request.form.get('end_date')
            reason = request.form.get('reason')
            
            # Validate form data
            if not all([leave_type, start_date, end_date, reason]):
                return render_template('employee_leave_request.html',
                                     employee=employee,
                                     error='All fields are required.')
            
            # In a real application, this would:
            # 1. Validate dates
            # 2. Check leave balance
            # 3. Store request in database
            # 4. Send notification to manager
            
            # Mock success response
            return render_template('employee_leave_request.html',
                                 employee=employee,
                                 success='Leave request submitted successfully!')
        
        # GET request - show form
        leave_requests = get_recent_leave_requests()
        
        return render_template('employee_leave_request.html',
                             employee=employee,
                             leave_requests=leave_requests)
    
    except Exception as e:
        print(f"Error processing leave request: {str(e)}")
        return render_template('error.html',
                             error_message="Unable to process leave request.")

# @employee_bp.route('/profile')
# @employee_required
# def profile():
#     """Employee profile page (placeholder)"""
#     try:
#         employee = get_current_employee()
        
#         return render_template('employee_profile.html',
#                              employee=employee)
    
#     except Exception as e:
#         print(f"Error loading profile page: {str(e)}")
#         return render_template('error.html',
#                              error_message="Unable to load profile data.")

@employee_bp.route('/notifications')
@employee_required
def notifications():
    """Employee notifications page (placeholder)"""
    try:
        employee = get_current_employee()
        
        # Mock notifications data
        notifications = [
            {
                'id': 1,
                'title': 'Leave Request Approved',
                'message': 'Your annual leave request for March 15-17 has been approved.',
                'type': 'success',
                'read': False,
                'timestamp': '2025-03-20 10:30 AM'
            },
            {
                'id': 2,
                'title': 'Schedule Update',
                'message': 'Your work schedule for next week is now available.',
                'type': 'info',
                'read': False,
                'timestamp': '2025-03-19 02:15 PM'
            },
            {
                'id': 3,
                'title': 'System Maintenance',
                'message': 'Scheduled maintenance on Sunday, 2:00 AM - 4:00 AM.',
                'type': 'warning',
                'read': True,
                'timestamp': '2025-03-18 09:00 AM'
            }
        ]
        
        return render_template('employee_notifications.html',
                             employee=employee,
                             notifications=notifications)
    
    except Exception as e:
        print(f"Error loading notifications: {str(e)}")
        return render_template('error.html',
                             error_message="Unable to load notifications.")

# Error handlers for employee blueprint
@employee_bp.errorhandler(404)
def employee_not_found(error):
    """Handle 404 errors in employee section"""
    return render_template('error.html',
                         error_message="Page not found in employee section."), 404

@employee_bp.errorhandler(500)
def employee_server_error(error):
    """Handle 500 errors in employee section"""
    return render_template('error.html',
                         error_message="Internal server error. Please try again."), 500

# Utility functions for employee operations
def calculate_attendance_rate(employee_id, period_days=30):
    """Calculate attendance rate for an employee over specified period"""
    # This would implement actual attendance rate calculation
    # For now, return mock data
    return 95

def get_leave_balance(employee_id):
    """Get remaining leave balance for an employee"""
    # This would fetch from database
    # For now, return mock data
    return {
        'annual_leave': 15,
        'sick_leave': 5,
        'personal_leave': 3,
        'total_used': 7
    }

def can_submit_leave_request(employee_id, start_date, end_date):
    """Check if employee can submit leave request for given dates"""
    # This would implement business logic for leave request validation
    # Check for overlapping requests, minimum notice period, etc.
    return True, ""  # (can_submit, error_message)

# Register the blueprint in your main app.py file:
# from employee_dashboard import employee_bp
# app.register_blueprint(employee_bp) 
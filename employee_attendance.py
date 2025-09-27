from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from datetime import datetime, date, timedelta
from functools import wraps
import os
import calendar
from supabase import create_client, Client

employee_attendance_bp = Blueprint('employee_attendance', __name__, url_prefix='/employee')

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(url, key)

def employee_required(f):
    """Decorator to require employee authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def get_employee_data():
    """Get current employee data from database"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return None
            
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
                'image': employee_data['image'],
                'role': employee_data['role']
            }
        else:
            return None
            
    except Exception as e:
        print(f"Error fetching employee data: {e}")
        return None

def get_attendance_stats(employee_id):
    """Get attendance statistics for employee"""
    try:
        today = date.today()
        current_month_start = today.replace(day=1)
        _, last_day = calendar.monthrange(today.year, today.month)
        current_month_end = today.replace(day=last_day)

        response = supabase.table('attendance') \
            .select('*') \
            .eq('employee_id', employee_id) \
            .gte('date', current_month_start) \
            .lte('date', current_month_end) \
            .execute()

        present_days = len([record for record in response.data if record['status'] == 'present']) if response.data else 0

        total_days = last_day  

        attendance_rate = (present_days / total_days * 100) if total_days > 0 else 0

        today_response = supabase.table('attendance') \
            .select('*') \
            .eq('employee_id', employee_id) \
            .eq('date', today) \
            .execute()
        marked_today = len(today_response.data) > 0

        return {
            'total_days': total_days,
            'present_days': present_days,
            'attendance_rate': round(attendance_rate, 1),
            'marked_today': marked_today,
            'current_month': current_month_start.strftime('%B %Y')
        }

    except Exception as e:
        print(f"Error fetching attendance stats: {e}")
        return {
            'total_days': 0,
            'present_days': 0,
            'attendance_rate': 0,
            'marked_today': False,
            'current_month': date.today().strftime('%B %Y')
        }

def get_attendance_history(employee_id, limit=30):
    """Get attendance history for employee"""
    try:
        response = supabase.table('attendance').select('*').eq('employee_id', employee_id).order('date', desc=True).limit(limit).execute()
        
        attendance_records = []
        if response.data:
            for record in response.data:
                attendance_records.append({
                    'id': record['id'],
                    'date': record['date'],
                    'status': record['status'],
                    'created_at': record['created_at']
                })
        
        return attendance_records
        
    except Exception as e:
        print(f"Error fetching attendance history: {e}")
        return []

@employee_attendance_bp.route('/attendance')
@employee_required
def attendance():
    """Employee attendance page"""
    try:
        employee = get_employee_data()
        if not employee:
            return "Employee data not found", 404
        
        employee_id = session.get('user_id')
        attendance_stats = get_attendance_stats(employee_id)
        attendance_history = get_attendance_history(employee_id)
        
        return render_template('employee_attendance.html',
                             employee=employee,
                             attendance_stats=attendance_stats,
                             attendance_history=attendance_history)
    
    except Exception as e:
        print(f"Error loading attendance page: {str(e)}")
        return render_template('error.html', 
                             error_message="Unable to load attendance page. Please try again.")

@employee_attendance_bp.route('/attendance/mark', methods=['POST'])
@employee_required
def mark_attendance():
    """Mark attendance for today"""
    try:
        employee_id = session.get('user_id')
        today = date.today()
        
        existing_response = supabase.table('attendance').select('*').eq('employee_id', employee_id).eq('date', today).execute()
        
        if existing_response.data:
            return jsonify({
                'success': False,
                'message': 'Attendance already marked for today.',
                'type': 'warning'
            })
        
        insert_response = supabase.table('attendance').insert({
            'employee_id': employee_id,
            'date': today.isoformat(),
            'status': 'present',
            'created_at': datetime.now().isoformat()
        }).execute()
        
        if insert_response.data:
            updated_stats = get_attendance_stats(employee_id)
            
            return jsonify({
                'success': True,
                'message': 'Attendance marked successfully!',
                'type': 'success',
                'stats': updated_stats,
                'date': today.strftime('%B %d, %Y')
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to mark attendance. Please try again.',
                'type': 'error'
            })
    
    except Exception as e:
        print(f"Error marking attendance: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while marking attendance.',
            'type': 'error'
        }), 500

@employee_attendance_bp.route('/attendance/history')
@employee_required
def attendance_history():
    """Get attendance history (API endpoint)"""
    try:
        employee_id = session.get('user_id')
        limit = request.args.get('limit', 30, type=int)
        
        history = get_attendance_history(employee_id, limit)
        stats = get_attendance_stats(employee_id)
        
        return jsonify({
            'success': True,
            'history': history,
            'stats': stats
        })
    
    except Exception as e:
        print(f"Error fetching attendance history: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Unable to fetch attendance history'
        }), 500

@employee_attendance_bp.route('/attendance/stats')
@employee_required
def attendance_stats():
    """Get attendance statistics (API endpoint)"""
    try:
        employee_id = session.get('user_id')
        stats = get_attendance_stats(employee_id)
        
        return jsonify({
            'success': True,
            'stats': stats
        })
    
    except Exception as e:
        print(f"Error fetching attendance stats: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Unable to fetch attendance statistics'
        }), 500

@employee_attendance_bp.errorhandler(404)
def attendance_not_found(error):
    """Handle 404 errors in attendance section"""
    return render_template('error.html',
                         error_message="Attendance page not found."), 404

@employee_attendance_bp.errorhandler(500)
def attendance_server_error(error):
    """Handle 500 errors in attendance section"""
    return render_template('error.html',
                         error_message="Internal server error. Please try again."), 500
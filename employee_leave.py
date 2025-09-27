from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
from supabase import create_client, Client
from datetime import datetime, date
import os
from dotenv import load_dotenv

load_dotenv()

employee_leave_bp = Blueprint('employee_leave', __name__, url_prefix='/employee')

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

LEAVE_TYPES = [
    {'value': 'vacation', 'label': 'Annual Leave/Vacation'},
    {'value': 'sick', 'label': 'Sick Leave'},
    {'value': 'personal', 'label': 'Personal Leave'},
    {'value': 'emergency', 'label': 'Emergency Leave'},
    {'value': 'maternity', 'label': 'Maternity Leave'},
    {'value': 'paternity', 'label': 'Paternity Leave'},
    {'value': 'bereavement', 'label': 'Bereavement Leave'},
    {'value': 'other', 'label': 'Other'}
]

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

def calculate_leave_days(start_date, end_date):
    """Calculate number of leave days between two dates"""
    try:
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        return (end - start).days + 1
    except:
        return 0

def get_leave_stats(employee_id):
    """Get leave statistics for employee"""
    try:
        current_year = datetime.now().year
        response = supabase.table('leave_requests').select('*').eq('employee_id', employee_id).execute()
        
        total_requested = 0
        approved_days = 0
        pending_requests = 0
        
        for leave in response.data:
            if leave['created_at'] and leave['created_at'].startswith(str(current_year)):
                days = calculate_leave_days(leave['start_date'], leave['end_date'])
                total_requested += days
                
                if leave['status'] == 'approved':
                    approved_days += days
                elif leave['status'] == 'pending':
                    pending_requests += 1
        
        return {
            'total_requested': total_requested,
            'approved_days': approved_days,
            'pending_requests': pending_requests,
            'remaining_balance': max(0, 20 - approved_days)
        }
    except Exception as e:
        print(f"Error calculating leave stats: {e}")
        return {
            'total_requested': 0,
            'approved_days': 0,
            'pending_requests': 0,
            'remaining_balance': 20
        }

@employee_leave_bp.route('/leave')
def leave_requests():
    """Display leave request page"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    try:
        employee = get_employee_data()
        if not employee:
            return redirect(url_for('login'))
        
        response = supabase.table('leave_requests').select('*').eq('employee_id', employee['employee_id']).order('created_at', desc=True).execute()
        
        leave_history = []
        for leave in response.data:
            leave_days = calculate_leave_days(leave['start_date'], leave['end_date'])
            leave_type_label = next((lt['label'] for lt in LEAVE_TYPES if lt['value'] == leave['leave_type']), leave['leave_type'].title())
            
            leave_history.append({
                'id': leave['id'],
                'leave_type': leave['leave_type'],
                'leave_type_label': leave_type_label,
                'start_date': leave['start_date'],
                'end_date': leave['end_date'],
                'reason': leave['reason'],
                'status': leave['status'],
                'created_at': leave['created_at'][:10] if leave['created_at'] else '',
                'leave_days': leave_days
            })
        
        leave_stats = get_leave_stats(employee['employee_id'])
        
        return render_template('employee_leave.html',
                             employee=employee,
                             leave_types=LEAVE_TYPES,
                             leave_history=leave_history,
                             leave_stats=leave_stats)
        
    except Exception as e:
        print(f"Error loading leave requests page: {e}")
        flash('Error loading leave requests page', 'error')
        return redirect(url_for('employee_dashboard_full'))

@employee_leave_bp.route('/leave/submit', methods=['POST'])
def submit_leave_request():
    """Submit a new leave request"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        
        required_fields = ['leave_type', 'start_date', 'end_date', 'reason']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field.replace("_", " ").title()} is required'}), 400
        
        leave_type = data['leave_type']
        start_date = data['start_date']
        end_date = data['end_date']
        reason = data['reason'].strip()
        
        valid_leave_types = [lt['value'] for lt in LEAVE_TYPES]
        if leave_type not in valid_leave_types:
            return jsonify({'success': False, 'error': 'Invalid leave type'}), 400
        
        try:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'error': 'Invalid date format'}), 400
        
        if start_date_obj < date.today():
            return jsonify({'success': False, 'error': 'Start date cannot be in the past'}), 400
        
        if end_date_obj < start_date_obj:
            return jsonify({'success': False, 'error': 'End date must be after start date'}), 400
        
        employee_id = session['user_id']
        overlap_response = supabase.table('leave_requests').select('*').eq('employee_id', employee_id).neq('status', 'rejected').execute()
        
        for existing_leave in overlap_response.data:
            existing_start = datetime.strptime(existing_leave['start_date'], '%Y-%m-%d').date()
            existing_end = datetime.strptime(existing_leave['end_date'], '%Y-%m-%d').date()
            
            if not (end_date_obj < existing_start or start_date_obj > existing_end):
                return jsonify({'success': False, 'error': 'Leave request overlaps with existing request'}), 400
        
        leave_days = calculate_leave_days(start_date, end_date)
        
        leave_request_data = {
            'employee_id': employee_id,
            'leave_type': leave_type,
            'start_date': start_date,
            'end_date': end_date,
            'reason': reason,
            'status': 'pending'
        }
        
        response = supabase.table('leave_requests').insert(leave_request_data).execute()
        
        if response.data:
            leave_type_label = next((lt['label'] for lt in LEAVE_TYPES if lt['value'] == leave_type), leave_type.title())
            
            return jsonify({
                'success': True,
                'message': f'Leave request submitted successfully! ({leave_days} days)',
                'leave_request': {
                    'id': response.data[0]['id'],
                    'leave_type': leave_type,
                    'leave_type_label': leave_type_label,
                    'start_date': start_date,
                    'end_date': end_date,
                    'reason': reason,
                    'status': 'pending',
                    'leave_days': leave_days,
                    'created_at': datetime.now().strftime('%Y-%m-%d')
                }
            })
        else:
            return jsonify({'success': False, 'error': 'Failed to submit leave request'}), 500
            
    except Exception as e:
        print(f"Error submitting leave request: {e}")
        return jsonify({'success': False, 'error': 'Failed to submit leave request'}), 500

@employee_leave_bp.route('/leave/history')
def leave_history():
    """Get leave request history"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        employee_id = session['user_id']
        
        response = supabase.table('leave_requests').select('*').eq('employee_id', employee_id).order('created_at', desc=True).execute()
        
        leave_history = []
        for leave in response.data:
            leave_days = calculate_leave_days(leave['start_date'], leave['end_date'])
            leave_type_label = next((lt['label'] for lt in LEAVE_TYPES if lt['value'] == leave['leave_type']), leave['leave_type'].title())
            
            leave_history.append({
                'id': leave['id'],
                'leave_type': leave['leave_type'],
                'leave_type_label': leave_type_label,
                'start_date': leave['start_date'],
                'end_date': leave['end_date'],
                'reason': leave['reason'],
                'status': leave['status'],
                'created_at': leave['created_at'][:10] if leave['created_at'] else '',
                'leave_days': leave_days
            })
        
        leave_stats = get_leave_stats(employee_id)
        
        return jsonify({
            'success': True,
            'history': leave_history,
            'stats': leave_stats
        })
        
    except Exception as e:
        print(f"Error fetching leave history: {e}")
        return jsonify({'success': False, 'error': 'Failed to fetch leave history'}), 500

@employee_leave_bp.route('/leave/stats')
def leave_statistics():
    """Get leave statistics"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        employee_id = session['user_id']
        stats = get_leave_stats(employee_id)
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        print(f"Error fetching leave stats: {e}")
        return jsonify({'success': False, 'error': 'Failed to fetch statistics'}), 500

@employee_leave_bp.route('/leave/<leave_id>/cancel', methods=['POST'])
def cancel_leave_request(leave_id):
    """Cancel a pending leave request"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        employee_id = session['user_id']
        
        response = supabase.table('leave_requests').select('*').eq('id', leave_id).eq('employee_id', employee_id).execute()
        
        if not response.data:
            return jsonify({'success': False, 'error': 'Leave request not found'}), 404
        
        leave_request = response.data[0]
        
        if leave_request['status'] != 'pending':
            return jsonify({'success': False, 'error': 'Can only cancel pending requests'}), 400
        
        delete_response = supabase.table('leave_requests').delete().eq('id', leave_id).execute()
        
        if delete_response.data:
            return jsonify({
                'success': True,
                'message': 'Leave request cancelled successfully'
            })
        else:
            return jsonify({'success': False, 'error': 'Failed to cancel leave request'}), 500
            
    except Exception as e:
        print(f"Error cancelling leave request: {e}")
        return jsonify({'success': False, 'error': 'Failed to cancel leave request'}), 500
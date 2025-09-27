from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for, session
from datetime import datetime, date, timedelta
from supabase import create_client, Client
import os
from functools import wraps
import uuid

admin_attendance_bp = Blueprint('admin_attendance', __name__)

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('user_role') != 'admin':
            flash('Admin access required.', 'error')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@admin_attendance_bp.route('/admin/attendance')
@admin_required
def attendance():
    """Main attendance page for admin"""
    try:
        employees_response = supabase.table('employees').select('id, name, department, position, status').eq('role', 'employee').order('name').execute()
        employees = employees_response.data if employees_response.data else []
        
        today = date.today()
        
        attendance_response = supabase.table('attendance').select('employee_id, status').eq('date', today.isoformat()).execute()
        attendance_today = attendance_response.data if attendance_response.data else []
        
        total_present = len([a for a in attendance_today if a['status'] == 'present'])
        total_absent = len([a for a in attendance_today if a['status'] == 'absent'])
        total_late = len([a for a in attendance_today if a['status'] == 'late'])
        
        total_employees = len([e for e in employees if e['status'] == 'active'])
        
        stats = {
            'total_employees': total_employees,
            'present': total_present,
            'absent': total_absent,
            'late': total_late,
            'not_marked': total_employees - len(attendance_today)
        }
        
        seven_days_ago = (today - timedelta(days=7)).isoformat()
        recent_attendance_response = supabase.table('attendance').select('*, employees(name, department)').gte('date', seven_days_ago).order('date', desc=True).order('employees(name)').limit(50).execute()
        
        attendance_data = []
        if recent_attendance_response.data:
            for record in recent_attendance_response.data:
                attendance_data.append({
                    'id': record['id'],
                    'date': datetime.fromisoformat(record['date']).date(),
                    'name': record['employees']['name'] if record['employees'] else 'Unknown',
                    'department': record['employees']['department'] if record['employees'] else 'Unknown',
                    'status': record['status'],
                    'created_at': datetime.fromisoformat(record['created_at'].replace('Z', '+00:00')) if record['created_at'] else None
                })
        
        return render_template('admin_attendance.html',
                             employees=employees,
                             attendance_data=attendance_data,
                             stats=stats,
                             today=today,
                             user_name=session.get('user_name', 'Admin'))
                             
    except Exception as e:
        print(f"Error in attendance route: {e}")
        flash('An error occurred while loading attendance data.', 'error')
        return render_template('admin_attendance.html', 
                             employees=[], attendance_data=[], 
                             stats={}, user_name=session.get('user_name', 'Admin'))

@admin_attendance_bp.route('/admin/attendance/mark', methods=['POST'])
@admin_required
def mark_attendance():
    """Mark attendance for an employee"""
    try:
        data = request.get_json()
        employee_id = data.get('employee_id')
        status = data.get('status')
        attendance_date = data.get('date')
        
        if not employee_id or not status or not attendance_date:
            return jsonify({'success': False, 'message': 'Missing required fields'})
        
        if status not in ['present', 'absent', 'late']:
            return jsonify({'success': False, 'message': 'Invalid status'})
        
        try:
            attendance_date = datetime.strptime(attendance_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format'})
        
        if attendance_date > date.today():
            return jsonify({'success': False, 'message': 'Cannot mark attendance for future dates'})
        
        employee_response = supabase.table('employees').select('id, name').eq('id', employee_id).eq('role', 'employee').eq('status', 'active').execute()
        
        if not employee_response.data:
            return jsonify({'success': False, 'message': 'Employee not found or inactive'})
        
        employee = employee_response.data[0]
        
        existing_response = supabase.table('attendance').select('id').eq('employee_id', employee_id).eq('date', attendance_date.isoformat()).execute()
        
        if existing_response.data:
            update_response = supabase.table('attendance').update({
                'status': status,
                'created_at': datetime.now().isoformat()
            }).eq('employee_id', employee_id).eq('date', attendance_date.isoformat()).execute()
            
            if update_response.data:
                return jsonify({
                    'success': True, 
                    'message': f'Attendance updated to {status} for {employee["name"]}'
                })
        else:
            insert_response = supabase.table('attendance').insert({
                'employee_id': employee_id,
                'date': attendance_date.isoformat(),
                'status': status
            }).execute()
            
            if insert_response.data:
                return jsonify({
                    'success': True, 
                    'message': f'Attendance marked as {status} for {employee["name"]}'
                })
        
        return jsonify({'success': False, 'message': 'Failed to mark attendance'})
            
    except Exception as e:
        print(f"Error marking attendance: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while marking attendance'})

@admin_attendance_bp.route('/admin/attendance/filter')
@admin_required
def filter_attendance():
    """Filter attendance records"""
    try:
        employee_id = request.args.get('employee_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        status = request.args.get('status')
        
        query = supabase.table('attendance').select('id, date, status, created_at, employees(name, department, position)')
        
        if employee_id:
            query = query.eq('employee_id', employee_id)
        
        if start_date:
            query = query.gte('date', start_date)
        
        if end_date:
            query = query.lte('date', end_date)
        
        if status:
            query = query.eq('status', status)
        
        response = query.order('date', desc=True).order('employees(name)').limit(100).execute()
        
        records = []
        if response.data:
            for record in response.data:
                records.append({
                    'id': record['id'],
                    'date': record['date'],
                    'name': record['employees']['name'] if record['employees'] else 'Unknown',
                    'department': record['employees']['department'] if record['employees'] else 'Unknown',
                    'position': record['employees']['position'] if record['employees'] else 'Unknown',
                    'status': record['status'],
                    'created_at': record['created_at'] if record['created_at'] else ''
                })
        
        return jsonify({'success': True, 'data': records})
        
    except Exception as e:
        print(f"Error filtering attendance: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while filtering attendance'})

@admin_attendance_bp.route('/admin/attendance/bulk-mark', methods=['POST'])
@admin_required
def bulk_mark_attendance():
    """Bulk mark attendance for multiple employees"""
    try:
        data = request.get_json()
        employee_ids = data.get('employee_ids', [])
        status = data.get('status')
        attendance_date = data.get('date')
        
        if not employee_ids or not status or not attendance_date:
            return jsonify({'success': False, 'message': 'Missing required fields'})
        
        if status not in ['present', 'absent', 'late']:
            return jsonify({'success': False, 'message': 'Invalid status'})
        
        try:
            attendance_date = datetime.strptime(attendance_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format'})
        
        if attendance_date > date.today():
            return jsonify({'success': False, 'message': 'Cannot mark attendance for future dates'})
        
        success_count = 0
        failed_employees = []
        
        for employee_id in employee_ids:
            try:
                employee_response = supabase.table('employees').select('name').eq('id', employee_id).eq('role', 'employee').eq('status', 'active').execute()
                
                if not employee_response.data:
                    failed_employees.append(f"Employee {employee_id} not found")
                    continue
                
                existing_response = supabase.table('attendance').select('id').eq('employee_id', employee_id).eq('date', attendance_date.isoformat()).execute()
                
                if existing_response.data:
                    supabase.table('attendance').update({
                        'status': status,
                        'created_at': datetime.now().isoformat()
                    }).eq('employee_id', employee_id).eq('date', attendance_date.isoformat()).execute()
                else:
                    supabase.table('attendance').insert({
                        'employee_id': employee_id,
                        'date': attendance_date.isoformat(),
                        'status': status
                    }).execute()
                
                success_count += 1
                
            except Exception as e:
                failed_employees.append(f"Failed for employee {employee_id}: {str(e)}")
                continue
        
        message = f'Bulk attendance marked for {success_count} employees'
        if failed_employees:
            message += f'. Failed for {len(failed_employees)} employees'
        
        return jsonify({
            'success': True,
            'message': message,
            'success_count': success_count,
            'failed_count': len(failed_employees),
            'failed_employees': failed_employees
        })
        
    except Exception as e:
        print(f"Error in bulk mark attendance: {e}")
        return jsonify({'success': False, 'message': 'An error occurred during bulk attendance marking'})

@admin_attendance_bp.route('/admin/attendance/report')
@admin_required
def attendance_report():
    """Generate attendance report"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        employee_id = request.args.get('employee_id')
        
        if not start_date or not end_date:
            return jsonify({'success': False, 'message': 'Start date and end date are required'})
        
        employees_query = supabase.table('employees').select('id, name, department, position').eq('role', 'employee').eq('status', 'active')
        
        if employee_id:
            employees_query = employees_query.eq('id', employee_id)
        
        employees_response = employees_query.execute()
        employees = employees_response.data if employees_response.data else []
        
        attendance_response = supabase.table('attendance').select('employee_id, status').gte('date', start_date).lte('date', end_date).execute()
        attendance_data = attendance_response.data if attendance_response.data else []
        
        report = []
        for employee in employees:
            emp_attendance = [a for a in attendance_data if a['employee_id'] == employee['id']]
            
            present_days = len([a for a in emp_attendance if a['status'] == 'present'])
            absent_days = len([a for a in emp_attendance if a['status'] == 'absent'])
            late_days = len([a for a in emp_attendance if a['status'] == 'late'])
            total_marked_days = len(emp_attendance)
            
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            working_days = 0
            current = start
            while current <= end:
                if current.weekday() < 5: 
                    working_days += 1
                current += timedelta(days=1)
            
            attendance_percentage = 0
            if working_days > 0:
                attendance_percentage = round((present_days / working_days) * 100, 2)
            
            report.append({
                'name': employee['name'],
                'department': employee['department'],
                'position': employee['position'],
                'present_days': present_days,
                'absent_days': absent_days,
                'late_days': late_days,
                'total_marked_days': total_marked_days,
                'working_days': working_days,
                'attendance_percentage': attendance_percentage
            })
        
        return jsonify({
            'success': True,
            'data': report,
            'summary': {
                'start_date': start_date,
                'end_date': end_date,
                'working_days': working_days,
                'total_employees': len(report)
            }
        })
        
    except Exception as e:
        print(f"Error generating attendance report: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while generating the report'})

@admin_attendance_bp.route('/admin/attendance/delete/<attendance_id>', methods=['DELETE'])
@admin_required
def delete_attendance(attendance_id):
    """Delete attendance record"""
    try:
        response = supabase.table('attendance').delete().eq('id', attendance_id).execute()
        
        if response.data:
            return jsonify({'success': True, 'message': 'Attendance record deleted successfully'})
        else:
            return jsonify({'success': False, 'message': 'Attendance record not found'})
            
    except Exception as e:
        print(f"Error deleting attendance: {e}")
        return jsonify({'success': False, 'message': 'An error occurred while deleting the attendance record'})
        
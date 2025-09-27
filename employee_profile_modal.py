from flask import jsonify, session
from supabase import Client
import logging

def get_employee_profile_data(supabase: Client):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return {
                'success': False,
                'error': 'User not authenticated',
                'code': 'UNAUTHORIZED'
            }
        
        response = supabase.table('employees').select('*').eq('id', user_id).execute()
        
        if not response.data:
            return {
                'success': False,
                'error': 'Employee profile not found',
                'code': 'NOT_FOUND'
            }
        
        employee_data = response.data[0]
        formatted_employee = format_employee_data(employee_data)
        
        return {
            'success': True,
            'employee': formatted_employee,
            'message': 'Profile data retrieved successfully'
        }
        
    except Exception as e:
        logging.error(f"Error fetching employee profile data: {str(e)}")
        return {
            'success': False,
            'error': 'Failed to retrieve profile data',
            'code': 'SERVER_ERROR',
            'details': str(e) if logging.getLogger().isEnabledFor(logging.DEBUG) else None
        }

def format_employee_data(employee_data):
    try:
        name_parts = (employee_data.get('name', '')).strip().split()
        first_name = name_parts[0] if name_parts else 'Employee'
        last_name = name_parts[-1] if len(name_parts) > 1 else ''
        full_name = employee_data.get('name', '').strip()
        
        hire_date = None
        if employee_data.get('created_at'):
            try:
                from datetime import datetime
                date_obj = datetime.fromisoformat(employee_data['created_at'].replace('Z', '+00:00'))
                hire_date = date_obj.strftime('%Y-%m-%d')
            except (ValueError, AttributeError) as e:
                logging.warning(f"Error parsing hire date: {e}")
                hire_date = employee_data.get('created_at', '')[:10]
        
        phone = employee_data.get('phone', '')
        if phone:
            phone = format_phone_number(phone)
        
        status = employee_data.get('status', 'active').lower()
        if status not in ['active', 'inactive', 'pending']:
            status = 'active'
        
        position = (employee_data.get('position', '') or 'Not assigned').strip()
        department = (employee_data.get('department', '') or 'Not assigned').strip()
        
        formatted_data = {
            'id': employee_data.get('id', ''),
            'employee_id': employee_data.get('id', '')[:8] + '...' if employee_data.get('id') else 'N/A',
            'first_name': first_name,
            'last_name': last_name,
            'full_name': full_name if full_name else f"{first_name} {last_name}".strip(),
            'name': full_name,
            'email': employee_data.get('email', ''),
            'phone': phone or 'Not provided',
            'position': position,
            'department': department,
            'role': employee_data.get('role', 'employee'),
            'status': status,
            'hire_date': hire_date,
            'created_at': employee_data.get('created_at', ''),
            'image': employee_data.get('image', ''),
        }
        
        return formatted_data
        
    except Exception as e:
        logging.error(f"Error formatting employee data: {str(e)}")
        return {
            'id': employee_data.get('id', ''),
            'employee_id': 'N/A',
            'first_name': 'Employee',
            'last_name': '',
            'full_name': employee_data.get('name', 'Employee'),
            'name': employee_data.get('name', 'Employee'),
            'email': employee_data.get('email', 'N/A'),
            'phone': 'N/A',
            'position': 'N/A',
            'department': 'N/A',
            'role': employee_data.get('role', 'employee'),
            'status': 'active',
            'hire_date': 'N/A',
            'created_at': employee_data.get('created_at', ''),
            'image': employee_data.get('image', ''),
        }

def format_phone_number(phone):
    try:
        digits = ''.join(filter(str.isdigit, phone))
        if len(digits) == 11 and digits.startswith('1'):
            return f"{digits[0]}-{digits[1:4]}-{digits[4:7]}-{digits[7:]}"
        elif len(digits) == 10:
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        elif len(digits) >= 7:
            if len(digits) <= 7:
                return f"{digits[:3]}-{digits[3:]}"
            else:
                return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
        else:
            return phone
    except Exception as e:
        logging.warning(f"Error formatting phone number '{phone}': {e}")
        return phone

def validate_employee_access(user_id, requested_employee_id=None):
    try:
        if requested_employee_id and requested_employee_id != user_id:
            return False
        return True
    except Exception as e:
        logging.error(f"Error validating employee access: {str(e)}")
        return False

def log_profile_access(user_id, success=True, error_details=None):
    try:
        from datetime import datetime
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'user_id': user_id,
            'action': 'profile_access',
            'success': success,
            'ip_address': None,
            'user_agent': None,
        }
        if error_details:
            log_data['error_details'] = error_details
        if success:
            logging.info(f"Profile access successful for user {user_id}")
        else:
            logging.warning(f"Profile access failed for user {user_id}: {error_details}")
    except Exception as e:
        logging.error(f"Error logging profile access: {str(e)}")

def get_employee_profile_summary(supabase: Client, user_id):
    try:
        response = supabase.table('employees').select(
            'id, name, email, position, department, image, status'
        ).eq('id', user_id).execute()
        
        if not response.data:
            return None
            
        employee_data = response.data[0]
        name_parts = (employee_data.get('name', '')).strip().split()
        
        return {
            'id': employee_data.get('id', ''),
            'first_name': name_parts[0] if name_parts else 'Employee',
            'last_name': name_parts[-1] if len(name_parts) > 1 else '',
            'full_name': employee_data.get('name', ''),
            'position': employee_data.get('position', 'Employee'),
            'image': employee_data.get('image', ''),
            'status': employee_data.get('status', 'active')
        }
        
    except Exception as e:
        logging.error(f"Error fetching employee profile summary: {str(e)}")
        return None

def create_profile_route_handler(supabase: Client):
    def handle_profile_data_request():
        try:
            user_id = session.get('user_id')
            log_profile_access(user_id, success=True)
            result = get_employee_profile_data(supabase)
            status_code = 200 if result['success'] else (
                401 if result.get('code') == 'UNAUTHORIZED' else
                404 if result.get('code') == 'NOT_FOUND' else 500
            )
            return jsonify(result), status_code
        except Exception as e:
            logging.error(f"Unhandled error in profile route: {str(e)}")
            log_profile_access(session.get('user_id'), success=False, error_details=str(e))
            return jsonify({
                'success': False,
                'error': 'Internal server error',
                'code': 'SERVER_ERROR'
            }), 500
    return handle_profile_data_request

# employee_profile_modal.py
from flask import jsonify, session
from supabase import Client
import logging

def get_employee_profile_data(supabase: Client):
    """
    Fetch current employee's profile data from the database
    
    Args:
        supabase (Client): Supabase client instance
        
    Returns:
        dict: JSON response with employee profile data or error
    """
    try:
        # Check if user is authenticated
        user_id = session.get('user_id')
        if not user_id:
            return {
                'success': False,
                'error': 'User not authenticated',
                'code': 'UNAUTHORIZED'
            }
        
        # Fetch employee data from database
        response = supabase.table('employees').select('*').eq('id', user_id).execute()
        
        if not response.data:
            return {
                'success': False,
                'error': 'Employee profile not found',
                'code': 'NOT_FOUND'
            }
        
        employee_data = response.data[0]
        
        # Format employee data for frontend
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
    """
    Format raw employee data from database for frontend consumption
    
    Args:
        employee_data (dict): Raw employee data from database
        
    Returns:
        dict: Formatted employee data
    """
    try:
        # Parse name into first and last name
        name_parts = (employee_data.get('name', '')).strip().split()
        first_name = name_parts[0] if name_parts else 'Employee'
        last_name = name_parts[-1] if len(name_parts) > 1 else ''
        full_name = employee_data.get('name', '').strip()
        
        # Format hire date
        hire_date = None
        if employee_data.get('created_at'):
            try:
                from datetime import datetime
                date_obj = datetime.fromisoformat(employee_data['created_at'].replace('Z', '+00:00'))
                hire_date = date_obj.strftime('%Y-%m-%d')
            except (ValueError, AttributeError) as e:
                logging.warning(f"Error parsing hire date: {e}")
                hire_date = employee_data.get('created_at', '')[:10]  # Fallback to first 10 chars
        
        # Format phone number
        phone = employee_data.get('phone', '')
        if phone:
            phone = format_phone_number(phone)
        
        # Determine status
        status = employee_data.get('status', 'active').lower()
        if status not in ['active', 'inactive', 'pending']:
            status = 'active'  # Default to active for unknown statuses
        
        # Format position and department
        position = (employee_data.get('position', '') or 'Not assigned').strip()
        department = (employee_data.get('department', '') or 'Not assigned').strip()
        
        formatted_data = {
            'id': employee_data.get('id', ''),
            'employee_id': employee_data.get('id', '')[:8] + '...' if employee_data.get('id') else 'N/A',  # Shortened ID for display
            'first_name': first_name,
            'last_name': last_name,
            'full_name': full_name if full_name else f"{first_name} {last_name}".strip(),
            'name': full_name,  # Alias for compatibility
            'email': employee_data.get('email', ''),
            'phone': phone or 'Not provided',
            'position': position,
            'department': department,
            'role': employee_data.get('role', 'employee'),
            'status': status,
            'hire_date': hire_date,
            'created_at': employee_data.get('created_at', ''),
            'image': employee_data.get('image', ''),  # Profile image URL
        }
        
        return formatted_data
        
    except Exception as e:
        logging.error(f"Error formatting employee data: {str(e)}")
        # Return minimal data in case of formatting errors
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
    """
    Format phone number for display
    
    Args:
        phone (str): Raw phone number
        
    Returns:
        str: Formatted phone number
    """
    try:
        # Remove all non-digit characters
        digits = ''.join(filter(str.isdigit, phone))
        
        # Format based on length
        if len(digits) == 11 and digits.startswith('1'):
            # US format with country code: 1-234-567-8900
            return f"{digits[0]}-{digits[1:4]}-{digits[4:7]}-{digits[7:]}"
        elif len(digits) == 10:
            # US format without country code: (234) 567-8900
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        elif len(digits) >= 7:
            # Generic format for other lengths: 123-4567 or 123-456-7890
            if len(digits) <= 7:
                return f"{digits[:3]}-{digits[3:]}"
            else:
                return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
        else:
            # Return original if too short
            return phone
            
    except Exception as e:
        logging.warning(f"Error formatting phone number '{phone}': {e}")
        return phone  # Return original on error

def validate_employee_access(user_id, requested_employee_id=None):
    """
    Validate that the current user can access employee profile data
    
    Args:
        user_id (str): Current user's ID
        requested_employee_id (str, optional): ID of employee being accessed
        
    Returns:
        bool: True if access is allowed, False otherwise
    """
    try:
        # For profile modal, users can only access their own profile
        if requested_employee_id and requested_employee_id != user_id:
            return False
        
        # Additional validation could be added here
        # For example, checking if user account is active, etc.
        
        return True
        
    except Exception as e:
        logging.error(f"Error validating employee access: {str(e)}")
        return False

def log_profile_access(user_id, success=True, error_details=None):
    """
    Log profile access attempts for security/audit purposes
    
    Args:
        user_id (str): User ID accessing profile
        success (bool): Whether the access was successful
        error_details (str, optional): Error details if unsuccessful
    """
    try:
        from datetime import datetime
        
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'user_id': user_id,
            'action': 'profile_access',
            'success': success,
            'ip_address': None,  # Could be added from Flask request
            'user_agent': None,  # Could be added from Flask request
        }
        
        if error_details:
            log_data['error_details'] = error_details
        
        # In a production environment, you might want to log this to a separate table
        # or external logging service
        if success:
            logging.info(f"Profile access successful for user {user_id}")
        else:
            logging.warning(f"Profile access failed for user {user_id}: {error_details}")
            
    except Exception as e:
        # Don't let logging errors affect the main functionality
        logging.error(f"Error logging profile access: {str(e)}")

def get_employee_profile_summary(supabase: Client, user_id):
    """
    Get a summary of employee profile for navigation/header display
    
    Args:
        supabase (Client): Supabase client instance
        user_id (str): Employee user ID
        
    Returns:
        dict: Basic employee profile data for navigation
    """
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

# Route handler function to be added to app.py
def create_profile_route_handler(supabase: Client):
    """
    Create the Flask route handler for profile data endpoint
    
    Args:
        supabase (Client): Supabase client instance
        
    Returns:
        function: Flask route handler function
    """
    def handle_profile_data_request():
        """Flask route handler for /employee/profile-data"""
        try:
            user_id = session.get('user_id')
            
            # Log the access attempt
            log_profile_access(user_id, success=True)
            
            # Get profile data
            result = get_employee_profile_data(supabase)
            
            # Set appropriate HTTP status code
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

# Instructions for adding to app.py:
"""
To integrate this into your app.py file, add the following:

1. Import this module at the top:
   from employee_profile_modal import create_profile_route_handler

2. Add this route after your existing routes:
   @app.route('/employee/profile-data')
   def employee_profile_data():
       if 'user_id' not in session:
           return jsonify({'success': False, 'error': 'Not authenticated'}), 401
       
       handler = create_profile_route_handler(supabase)
       return handler()

3. Update the get_employee_data() function to use the profile summary:
   from employee_profile_modal import get_employee_profile_summary
   
   def get_employee_data():
       try:
           user_id = session.get('user_id')
           if not user_id:
               return None
           return get_employee_profile_summary(supabase, user_id)
       except Exception as e:
           print(f"Error fetching employee data: {e}")
           return None
"""
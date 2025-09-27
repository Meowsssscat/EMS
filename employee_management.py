from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
from datetime import datetime

employee_bp = Blueprint('employees', __name__, url_prefix='/admin/employees')


def get_supabase_client():
    """Get Supabase client instance"""
    from app import supabase
    return supabase


def require_admin_api():
    """Check if user is admin for API routes"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    
    if session.get('user_role') != 'admin':
        return jsonify({'success': False, 'error': 'Admin privileges required'}), 403
    
    return None


@employee_bp.route('/list', methods=['GET'])
def list_employees():
    """Get all employees (excluding admins)"""
    auth_check = require_admin_api()
    if auth_check:
        return auth_check
    
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('employees').select(
            'id, name, email, phone, position, department, role, image, created_at, plain_password, password_hash'
        ).eq('role', 'employee').execute()
        
        if response.data:
            employees = []
            for emp in response.data:
                employees.append({
                    'id': emp.get('id'),
                    'name': emp.get('name', ''),
                    'email': emp.get('email', ''),
                    'phone': emp.get('phone', ''),
                    'position': emp.get('position', ''),
                    'department': emp.get('department', ''),
                    'role': emp.get('role', 'employee'),
                    'image': emp.get('image', ''),
                    'created_at': emp.get('created_at', ''),
                    'plain_password': emp.get('plain_password', ''),
                    'has_password': bool(emp.get('password_hash'))
                })
            
            return jsonify({
                'success': True,
                'employees': employees,
                'count': len(employees)
            })
        else:
            return jsonify({
                'success': True,
                'employees': [],
                'count': 0
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to fetch employees: {str(e)}'
        }), 500


@employee_bp.route('/add', methods=['POST'])
def add_employee():
    """Add new employee"""
    auth_check = require_admin_api()
    if auth_check:
        return auth_check
    
    try:
        data = request.get_json()
        
        required_fields = ['name', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Field "{field}" is required'
                }), 400
        
        supabase = get_supabase_client()
        existing = supabase.table('employees').select('id').eq('email', data['email']).execute()
        
        if existing.data:
            return jsonify({
                'success': False,
                'error': 'Employee with this email already exists'
            }), 400
        
        plain_password = data['password']
        password_hash = generate_password_hash(plain_password)
        
        employee_data = {
            'id': str(uuid.uuid4()),
            'name': data['name'].strip(),
            'email': data['email'].strip().lower(),
            'password_hash': password_hash,
            'plain_password': plain_password,
            'role': data.get('role', 'employee'),
            'department': data.get('department', ''),
            'position': data.get('position', ''),
            'phone': data.get('phone', ''),
            'image': data.get('image', ''),
            'status': 'active',
            'created_at': datetime.utcnow().isoformat()
        }
        
        response = supabase.table('employees').insert(employee_data).execute()
        
        if response.data:
            return jsonify({
                'success': True,
                'message': 'Employee added successfully',
                'employee': {
                    'id': employee_data['id'],
                    'name': employee_data['name'],
                    'email': employee_data['email'],
                    'position': employee_data['position'],
                    'department': employee_data['department'],
                    'role': employee_data['role']
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to add employee to database'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to add employee: {str(e)}'
        }), 500


@employee_bp.route('/update/<employee_id>', methods=['POST'])
def update_employee(employee_id):
    """Update employee details"""
    auth_check = require_admin_api()
    if auth_check:
        return auth_check
    
    try:
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({
                'success': False,
                'error': 'Name is required'
            }), 400
        
        supabase = get_supabase_client()
        
        existing = supabase.table('employees').select('*').eq('id', employee_id).execute()
        
        if not existing.data:
            return jsonify({
                'success': False,
                'error': 'Employee not found'
            }), 404
        
        current_employee = existing.data[0]
        
        update_data = {
            'name': data['name'].strip(),
            'role': data.get('role', current_employee.get('role', 'employee')),
            'department': data.get('department', current_employee.get('department', '')),
            'position': data.get('position', current_employee.get('position', '')),
            'phone': data.get('phone', current_employee.get('phone', '')),
            'image': data.get('image', current_employee.get('image', ''))
        }
        
        if data.get('email') and data['email'].strip().lower() != current_employee.get('email', '').lower():
            email_check = supabase.table('employees').select('id').eq('email', data['email'].strip().lower()).execute()
            if email_check.data:
                return jsonify({
                    'success': False,
                    'error': 'Email already exists for another employee'
                }), 400
            update_data['email'] = data['email'].strip().lower()
        
        if data.get('password') and data['password'].strip():
            plain_password = data['password'].strip()
            password_hash = generate_password_hash(plain_password)
            update_data['password_hash'] = password_hash
            update_data['plain_password'] = plain_password
        
        response = supabase.table('employees').update(update_data).eq('id', employee_id).execute()
        
        if response.data:
            return jsonify({
                'success': True,
                'message': 'Employee updated successfully',
                'employee': {
                    'id': employee_id,
                    'name': update_data['name'],
                    'email': update_data.get('email', current_employee.get('email')),
                    'position': update_data['position'],
                    'department': update_data['department'],
                    'role': update_data['role']
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update employee in database'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to update employee: {str(e)}'
        }), 500


@employee_bp.route('/delete/<employee_id>', methods=['POST'])
def delete_employee(employee_id):
    """Delete employee by ID"""
    auth_check = require_admin_api()
    if auth_check:
        return auth_check
    
    try:
        supabase = get_supabase_client()
        
        existing = supabase.table('employees').select('id, name').eq('id', employee_id).execute()
        
        if not existing.data:
            return jsonify({
                'success': False,
                'error': 'Employee not found'
            }), 404
        
        employee_name = existing.data[0].get('name', 'Unknown')
        
        response = supabase.table('employees').delete().eq('id', employee_id).execute()
        
        return jsonify({
            'success': True,
            'message': f'Employee "{employee_name}" deleted successfully'
        })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to delete employee: {str(e)}'
        }), 500


@employee_bp.route('/get/<employee_id>', methods=['GET'])
def get_employee(employee_id):
    """Get single employee by ID"""
    auth_check = require_admin_api()
    if auth_check:
        return auth_check
    
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('employees').select(
            'id, name, email, phone, position, department, role, image, created_at, plain_password'
        ).eq('id', employee_id).execute()
        
        if response.data:
            employee = response.data[0]
            return jsonify({
                'success': True,
                'employee': {
                    'id': employee.get('id'),
                    'name': employee.get('name', ''),
                    'email': employee.get('email', ''),
                    'phone': employee.get('phone', ''),
                    'position': employee.get('position', ''),
                    'department': employee.get('department', ''),
                    'role': employee.get('role', 'employee'),
                    'image': employee.get('image', ''),
                    'created_at': employee.get('created_at', ''),
                    'plain_password': employee.get('plain_password', '')
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Employee not found'
            }), 404
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to fetch employee: {str(e)}'
        }), 500


@employee_bp.route('/upload-image', methods=['POST'])
def upload_image():
    """Upload employee image"""
    auth_check = require_admin_api()
    if auth_check:
        return auth_check
    
    try:
        import base64
        import os
        
        data = request.get_json()
        
        if not data.get('image_data') or not data.get('employee_id'):
            return jsonify({
                'success': False,
                'error': 'Image data and employee ID are required'
            }), 400
        
        image_data = data['image_data']
        employee_id = data['employee_id']
        
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        supabase = get_supabase_client()
        
        existing = supabase.table('employees').select('id').eq('id', employee_id).execute()
        if not existing.data:
            return jsonify({
                'success': False,
                'error': 'Employee not found'
            }), 404
        
        image_url = f"data:image/jpeg;base64,{image_data}"
        
        response = supabase.table('employees').update({
            'image': image_url
        }).eq('id', employee_id).execute()
        
        if response.data:
            return jsonify({
                'success': True,
                'message': 'Image uploaded successfully',
                'image_url': image_url
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to save image'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to upload image: {str(e)}'
        }), 500


@employee_bp.route('/search', methods=['GET'])
def search_employees():
    """Search employees by name, email, or position"""
    auth_check = require_admin_api()
    if auth_check:
        return auth_check
    
    try:
        query = request.args.get('q', '').strip().lower()
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Search query is required'
            }), 400
        
        supabase = get_supabase_client()
        
        response = supabase.table('employees').select(
            'id, name, email, phone, position, department, role, image, created_at, plain_password'
        ).eq('role', 'employee').execute()
        
        if response.data:
            filtered_employees = []
            for emp in response.data:
                name = emp.get('name', '').lower()
                email = emp.get('email', '').lower()
                position = emp.get('position', '').lower()
                department = emp.get('department', '').lower()
                
                if (query in name or query in email or 
                    query in position or query in department):
                    filtered_employees.append({
                        'id': emp.get('id'),
                        'name': emp.get('name', ''),
                        'email': emp.get('email', ''),
                        'phone': emp.get('phone', ''),
                        'position': emp.get('position', ''),
                        'department': emp.get('department', ''),
                        'role': emp.get('role', 'employee'),
                        'image': emp.get('image', ''),
                        'created_at': emp.get('created_at', ''),
                        'plain_password': emp.get('plain_password', '')
                    })
            
            return jsonify({
                'success': True,
                'employees': filtered_employees,
                'count': len(filtered_employees),
                'query': query
            })
        else:
            return jsonify({
                'success': True,
                'employees': [],
                'count': 0,
                'query': query
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Search failed: {str(e)}'
        }), 500


@employee_bp.route('/departments', methods=['GET'])
def get_departments():
    """Get list of all departments"""
    auth_check = require_admin_api()
    if auth_check:
        return auth_check
    
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('employees').select('department').execute()
        
        if response.data:
            departments = []
            seen = set()
            
            for emp in response.data:
                dept = emp.get('department', '').strip()
                if dept and dept not in seen:
                    departments.append(dept)
                    seen.add(dept)
            
            return jsonify({
                'success': True,
                'departments': sorted(departments)
            })
        else:
            return jsonify({
                'success': True,
                'departments': []
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to fetch departments: {str(e)}'
        }), 500


@employee_bp.route('/positions', methods=['GET'])
def get_positions():
    """Get list of all positions"""
    auth_check = require_admin_api()
    if auth_check:
        return auth_check
    
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('employees').select('position').execute()
        
        if response.data:
            positions = []
            seen = set()
            
            for emp in response.data:
                pos = emp.get('position', '').strip()
                if pos and pos not in seen:
                    positions.append(pos)
                    seen.add(pos)
            
            return jsonify({
                'success': True,
                'positions': sorted(positions)
            })
        else:
            return jsonify({
                'success': True,
                'positions': []
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to fetch positions: {str(e)}'
        }), 500


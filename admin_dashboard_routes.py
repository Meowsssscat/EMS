from flask import Blueprint, render_template, session, redirect, url_for, request, flash, jsonify
from supabase import Client

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')


def get_supabase_client():
    """Get Supabase client instance"""
    from app import supabase
    return supabase

@admin_bp.before_request
def require_admin():
    """Ensure user is logged in and has admin role for all admin routes"""
    if 'user_id' not in session:
        flash('Please log in to access this page')
        return redirect(url_for('login'))
    
    if session.get('user_role') != 'admin':
        flash('Access denied. Admin privileges required.')
        return redirect(url_for('employee_dashboard'))

# @admin_bp.route('/dashboard')
# def dashboard():
#     """Main admin dashboard route - now uses the new HR Analytics Dashboard"""
#     # Simply render the new analytics dashboard template
#     return render_template('admin_dashboard.html', 
#                          user_name=session.get('user_name'))

@admin_bp.route('/employees')
def employees():
    """Employee management route"""
    try:
        supabase = get_supabase_client()
        employees_response = supabase.table('employees').select('*').execute()
        
        employees = employees_response.data if employees_response.data else []
        
        return render_template('employee_management.html', 
                             user_name=session.get('user_name'),
                             employees=employees)
    
    except Exception as e:
        flash(f'Error loading employees: {str(e)}')
        return render_template('employee_management.html', 
                             user_name=session.get('user_name'),
                             employees=[])

@admin_bp.route('/analytics')
def analytics():
    """Analytics and reports route"""
    return render_template('admin_analytics.html', 
                         user_name=session.get('user_name'))

@admin_bp.route('/api/stats')
def get_stats():
    """API endpoint for dashboard statistics"""
    try:
        supabase = get_supabase_client()
        
        employees_response = supabase.table('employees').select('id, status').execute()
        
        stats = {
            'total_employees': len(employees_response.data) if employees_response.data else 0,
            'active_employees': len([emp for emp in (employees_response.data or []) if emp.get('status') == 'active']),
            'inactive_employees': len([emp for emp in (employees_response.data or []) if emp.get('status') == 'inactive']),
        }
        
        return jsonify(stats)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify
from supabase import create_client, Client
from datetime import datetime, date
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

load_dotenv()

leave_requests_bp = Blueprint('leave_requests', __name__, url_prefix='/admin')

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")  
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")  
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
supabase_admin = None
if SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def _safe_data(resp):
    """Helper function to safely extract data from Supabase response"""
    if resp is None:
        return None
    if hasattr(resp, "data"):
        return resp.data
    if isinstance(resp, dict):
        return resp.get("data")
    return None

def send_notification_email(employee_email, employee_name, leave_type, status, start_date, end_date, reason=None):
    """Send notification email using Gmail SMTP"""
    try:
        if not EMAIL_HOST_USER or not EMAIL_HOST_PASSWORD:
            print("Gmail SMTP credentials not configured. Queuing email for later processing.")
            return _queue_email_notification(employee_email, employee_name, leave_type, status, start_date, end_date, reason)
        
        subject = f"Leave Request {status.title()} - {leave_type}"
        
        html_body = _create_email_html_body(employee_name, leave_type, status, start_date, end_date, reason)
        
        plain_text_body = _create_email_text_body(employee_name, leave_type, status, start_date, end_date, reason)
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"EMS System <{EMAIL_HOST_USER}>"
        msg['To'] = employee_email
        
        part1 = MIMEText(plain_text_body, 'plain', 'utf-8')
        part2 = MIMEText(html_body, 'html', 'utf-8')
        
        msg.attach(part1)
        msg.attach(part2)
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()  
            server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
            
            text = msg.as_string()
            server.sendmail(EMAIL_HOST_USER, employee_email, text)
        
        print(f"Email sent successfully to {employee_name} ({employee_email})")
        
        log_notification(employee_email, employee_name, subject, 'sent', True)
        return True
        
    except smtplib.SMTPAuthenticationError as auth_error:
        print(f"Gmail SMTP authentication failed: {auth_error}")
        print("Please check your EMAIL_HOST_USER and EMAIL_HOST_PASSWORD credentials.")
        print("Make sure you're using an App Password, not your regular Gmail password.")
        log_notification(employee_email, employee_name, subject, 'failed', False)
        return False
        
    except smtplib.SMTPRecipientsRefused as recipient_error:
        print(f"Gmail SMTP recipient refused: {recipient_error}")
        log_notification(employee_email, employee_name, subject, 'failed', False)
        return False
        
    except smtplib.SMTPException as smtp_error:
        print(f"Gmail SMTP error: {smtp_error}")
        log_notification(employee_email, employee_name, subject, 'failed', False)
        return False
        
    except Exception as e:
        print(f"Unexpected error sending email: {e}")
        log_notification(employee_email, employee_name, subject, 'failed', False)
        return False

def _create_email_html_body(employee_name, leave_type, status, start_date, end_date, reason):
    """Create HTML email body based on status"""
    
    if status == 'approved':
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Leave Request Approved</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f5f5f5; padding: 30px; border-radius: 10px;">
                <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1A237E; margin: 0; font-size: 28px; font-weight: bold;">✅ Leave Request Approved</h1>
                    </div>
                    
                    <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>{employee_name}</strong>,</p>
                    
                    <p style="font-size: 16px; margin-bottom: 25px;">
                        We are pleased to inform you that your leave request has been <span style="color: #1A237E; font-weight: bold;">APPROVED</span>.
                    </p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1A237E;">
                        <h3 style="color: #1A237E; margin-top: 0; font-size: 18px;">Leave Details:</h3>
                        <table style="width: 100%; border-spacing: 0;">
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; width: 30%;">Leave Type:</td>
                                <td style="padding: 8px 0;">{leave_type}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Start Date:</td>
                                <td style="padding: 8px 0;">{start_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">End Date:</td>
                                <td style="padding: 8px 0;">{end_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Reason:</td>
                                <td style="padding: 8px 0;">{reason or 'Not specified'}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #2d5a2d; font-size: 14px;">
                            <strong>📝 Important:</strong> Please ensure all your pending tasks are completed or properly delegated before your leave period begins.
                        </p>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f0f0f0; text-align: center;">
                        <p style="color: #666; font-size: 14px; margin: 0;">
                            Best regards,<br>
                            <strong>HR Department</strong><br>
                            Employee Management System
                        </p>
                    </div>
                    
                </div>
            </div>
        </body>
        </html>
        """
        
    elif status == 'rejected':
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Leave Request Update</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f5f5f5; padding: 30px; border-radius: 10px;">
                <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1A237E; margin: 0; font-size: 28px; font-weight: bold;">❌ Leave Request Update</h1>
                    </div>
                    
                    <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>{employee_name}</strong>,</p>
                    
                    <p style="font-size: 16px; margin-bottom: 25px;">
                        We regret to inform you that your leave request has been <span style="color: #d32f2f; font-weight: bold;">REJECTED</span>.
                    </p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1A237E;">
                        <h3 style="color: #1A237E; margin-top: 0; font-size: 18px;">Leave Details:</h3>
                        <table style="width: 100%; border-spacing: 0;">
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; width: 30%;">Leave Type:</td>
                                <td style="padding: 8px 0;">{leave_type}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Start Date:</td>
                                <td style="padding: 8px 0;">{start_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">End Date:</td>
                                <td style="padding: 8px 0;">{end_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Reason:</td>
                                <td style="padding: 8px 0;">{reason or 'Not specified'}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #e65100; font-size: 14px;">
                            <strong>💬 Next Steps:</strong> Please contact HR if you have any questions or would like to discuss this decision.
                        </p>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f0f0f0; text-align: center;">
                        <p style="color: #666; font-size: 14px; margin: 0;">
                            Best regards,<br>
                            <strong>HR Department</strong><br>
                            Employee Management System
                        </p>
                    </div>
                    
                </div>
            </div>
        </body>
        </html>
        """
        
    else:  # pending
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Leave Request Submitted</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f5f5f5; padding: 30px; border-radius: 10px;">
                <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1A237E; margin: 0; font-size: 28px; font-weight: bold;">⏳ Leave Request Submitted</h1>
                    </div>
                    
                    <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>{employee_name}</strong>,</p>
                    
                    <p style="font-size: 16px; margin-bottom: 25px;">
                        Your leave request has been submitted and is currently <span style="color: #1A237E; font-weight: bold;">under review</span>.
                    </p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1A237E;">
                        <h3 style="color: #1A237E; margin-top: 0; font-size: 18px;">Leave Details:</h3>
                        <table style="width: 100%; border-spacing: 0;">
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; width: 30%;">Leave Type:</td>
                                <td style="padding: 8px 0;">{leave_type}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Start Date:</td>
                                <td style="padding: 8px 0;">{start_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">End Date:</td>
                                <td style="padding: 8px 0;">{end_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Reason:</td>
                                <td style="padding: 8px 0;">{reason or 'Not specified'}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #1565c0; font-size: 14px;">
                            <strong>📧 Status Update:</strong> You will be notified via email once a decision has been made.
                        </p>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f0f0f0; text-align: center;">
                        <p style="color: #666; font-size: 14px; margin: 0;">
                            Best regards,<br>
                            <strong>HR Department</strong><br>
                            Employee Management System
                        </p>
                    </div>
                    
                </div>
            </div>
        </body>
        </html>
        """

def _create_email_text_body(employee_name, leave_type, status, start_date, end_date, reason):
    """Create plain text email body as fallback"""
    
    if status == 'approved':
        return f"""
Dear {employee_name},

We are pleased to inform you that your leave request has been APPROVED.

Leave Details:
• Leave Type: {leave_type}
• Start Date: {start_date}
• End Date: {end_date}
• Reason: {reason or 'Not specified'}

Important: Please ensure all your pending tasks are completed or properly delegated before your leave period begins.

Best regards,
HR Department
Employee Management System
        """
        
    elif status == 'rejected':
        return f"""
Dear {employee_name},

We regret to inform you that your leave request has been REJECTED.

Leave Details:
• Leave Type: {leave_type}
• Start Date: {start_date}
• End Date: {end_date}
• Reason: {reason or 'Not specified'}

Next Steps: Please contact HR if you have any questions or would like to discuss this decision.

Best regards,
HR Department
Employee Management System
        """
        
    else:  # pending
        return f"""
Dear {employee_name},

Your leave request has been submitted and is currently under review.

Leave Details:
• Leave Type: {leave_type}
• Start Date: {start_date}
• End Date: {end_date}
• Reason: {reason or 'Not specified'}

Status Update: You will be notified via email once a decision has been made.

Best regards,
HR Department
Employee Management System
        """

def _queue_email_notification(employee_email, employee_name, leave_type, status, start_date, end_date, reason):
    """Store email notification in database for later processing when SMTP is not configured"""
    try:
        client = supabase_admin or supabase
        
        # Create subject and message
        subject = f"Leave Request {status.title()} - {leave_type}"
        message = _create_email_text_body(employee_name, leave_type, status, start_date, end_date, reason)
        
        notification_data = {
            'type': 'leave_status',
            'title': subject,
            'message': message,
            'recipient_email': employee_email,
            'recipient_name': employee_name,
            'status': 'pending',
            'email_sent': False,
            'created_at': datetime.now().isoformat()
        }
        
        result = client.table('notifications').insert(notification_data).execute()
        data = _safe_data(result)
        
        if data:
            print(f"Email notification queued for {employee_name} ({employee_email})")
            return True
        else:
            print(f"Failed to queue email notification")
            return False
            
    except Exception as e:
        print(f"Error queuing email notification: {e}")
        return False

def log_notification(email, name, subject, status, email_sent):
    """Log notification attempt in database"""
    try:
        client = supabase_admin or supabase
        
        log_data = {
            'type': 'leave_status',
            'title': subject,
            'message': f'Email notification for {name} ({email})',
            'recipient_email': email,
            'recipient_name': name,
            'status': status,
            'email_sent': email_sent,
            'created_at': datetime.now().isoformat()
        }
        
        client.table('notifications').insert(log_data).execute()
        
    except Exception as e:
        print(f"Failed to log notification: {e}")

def get_leave_requests_with_employee_info():
    """Fetch all leave requests with employee information"""
    try:
        client = supabase_admin or supabase
        response = client.table('leave_requests')\
            .select('*, employees(name, email, department, position)')\
            .order('created_at', desc=True)\
            .execute()
        return _safe_data(response) or []
    except Exception as e:
        print(f"Error fetching leave requests: {e}")
        return []

def validate_leave_request(employee_id, start_date, end_date):
    """Validate leave request for overlapping dates"""
    try:
        client = supabase_admin or supabase
        # Check for overlapping approved leave requests
        response = client.table('leave_requests')\
            .select('*')\
            .eq('employee_id', employee_id)\
            .eq('status', 'approved')\
            .execute()
        
        data = _safe_data(response) or []
        
        for leave in data:
            existing_start = datetime.strptime(leave['start_date'], '%Y-%m-%d').date()
            existing_end = datetime.strptime(leave['end_date'], '%Y-%m-%d').date()
            new_start = datetime.strptime(start_date, '%Y-%m-%d').date()
            new_end = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            # Check for overlap
            if (new_start <= existing_end and new_end >= existing_start):
                return False, "Leave request overlaps with existing approved leave"
        
        return True, "Valid"
    except Exception as e:
        print(f"Error validating leave request: {e}")
        return False, "Validation error"

@leave_requests_bp.route('/leave-requests')
def leave_requests_page():
    """Admin view for all leave requests"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user_role = session.get('user_role')
    user_name = session.get('user_name', 'Admin')
    
    if user_role != 'admin':
        flash('Access denied. Admin privileges required.')
        return redirect(url_for('home'))
    
    try:
        leave_data = get_leave_requests_with_employee_info()
        
        total_requests = len(leave_data)
        pending_requests = len([req for req in leave_data if req['status'] == 'pending'])
        approved_requests = len([req for req in leave_data if req['status'] == 'approved'])
        rejected_requests = len([req for req in leave_data if req['status'] == 'rejected'])
        
        client = supabase_admin or supabase
        employees_response = client.table('employees')\
            .select('id, name, email, department, position')\
            .eq('role', 'employee')\
            .order('name')\
            .execute()
        employees = _safe_data(employees_response) or []
        
        stats = {
            'total_requests': total_requests,
            'pending_requests': pending_requests,
            'approved_requests': approved_requests,
            'rejected_requests': rejected_requests
        }
        
        return render_template('leave_requests.html', 
                             leave_requests=leave_data, 
                             stats=stats,
                             employees=employees,
                             user_name=user_name)
    
    except Exception as e:
        flash(f'Error loading leave requests: {str(e)}', 'error')
        return render_template('leave_requests.html', 
                             leave_requests=[], 
                             stats={},
                             employees=[],
                             user_name=user_name)

@leave_requests_bp.route('/leave-requests/create', methods=['POST'])
def create_leave_request():
    """Create a new leave request (Admin can create for any employee)"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    
    user_role = session.get('user_role')
    if user_role != 'admin':
        return jsonify({'success': False, 'error': 'Admin privileges required'}), 403
    
    try:
        data = request.get_json()
        
        required_fields = ['employee_id', 'leave_type', 'start_date', 'end_date']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        employee_id = data['employee_id']
        leave_type = data['leave_type']
        start_date = data['start_date']
        end_date = data['end_date']
        reason = data.get('reason', '')
        
        try:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            if start_date_obj < date.today():
                return jsonify({'success': False, 'error': 'Start date cannot be in the past'}), 400
            
            if end_date_obj < start_date_obj:
                return jsonify({'success': False, 'error': 'End date must be after start date'}), 400
                
        except ValueError:
            return jsonify({'success': False, 'error': 'Invalid date format'}), 400
        
        is_valid, validation_message = validate_leave_request(employee_id, start_date, end_date)
        if not is_valid:
            return jsonify({'success': False, 'error': validation_message}), 400
        
        client = supabase_admin or supabase
        employee_response = client.table('employees')\
            .select('name, email')\
            .eq('id', employee_id)\
            .execute()
        
        employee_data = _safe_data(employee_response)
        if not employee_data:
            return jsonify({'success': False, 'error': 'Employee not found'}), 404
        
        employee = employee_data[0]
        
        insert_data = {
            'employee_id': employee_id,
            'leave_type': leave_type,
            'start_date': start_date,
            'end_date': end_date,
            'reason': reason,
            'status': 'pending'
        }
        
        response = client.table('leave_requests').insert(insert_data).execute()
        result_data = _safe_data(response)
        
        if result_data:
            send_notification_email(
                employee['email'], 
                employee['name'], 
                leave_type, 
                'pending', 
                start_date, 
                end_date, 
                reason
            )
            
            return jsonify({
                'success': True, 
                'message': 'Leave request created successfully',
                'data': result_data[0]
            })
        else:
            return jsonify({'success': False, 'error': 'Failed to create leave request'}), 500
            
    except Exception as e:
        print(f"Error creating leave request: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@leave_requests_bp.route('/leave-requests/update-status', methods=['POST'])
def update_leave_status():
    """Update leave request status"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    
    user_role = session.get('user_role')
    if user_role != 'admin':
        return jsonify({'success': False, 'error': 'Admin privileges required'}), 403
    
    try:
        data = request.get_json()
        
        request_id = data.get('request_id')
        new_status = data.get('status')
        
        if not request_id or not new_status:
            return jsonify({'success': False, 'error': 'Request ID and status are required'}), 400
        
        if new_status not in ['pending', 'approved', 'rejected']:
            return jsonify({'success': False, 'error': 'Invalid status'}), 400
        
        client = supabase_admin or supabase
        
        current_response = client.table('leave_requests')\
            .select('*, employees(name, email)')\
            .eq('id', request_id)\
            .execute()
        
        current_data = _safe_data(current_response)
        if not current_data:
            return jsonify({'success': False, 'error': 'Leave request not found'}), 404
        
        current_request = current_data[0]
        
        update_response = client.table('leave_requests')\
            .update({'status': new_status})\
            .eq('id', request_id)\
            .execute()
        
        update_data = _safe_data(update_response)
        if update_data:
            employee_info = current_request['employees']
            send_notification_email(
                employee_info['email'],
                employee_info['name'],
                current_request['leave_type'],
                new_status,
                current_request['start_date'],
                current_request['end_date'],
                current_request['reason']
            )
            
            return jsonify({
                'success': True,
                'message': f'Leave request {new_status} successfully',
                'data': update_data[0]
            })
        else:
            return jsonify({'success': False, 'error': 'Failed to update status'}), 500
            
    except Exception as e:
        print(f"Error updating leave status: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@leave_requests_bp.route('/leave-requests/delete', methods=['POST'])
def delete_leave_request():
    """Delete a leave request"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    
    user_role = session.get('user_role')
    if user_role != 'admin':
        return jsonify({'success': False, 'error': 'Admin privileges required'}), 403
    
    try:
        data = request.get_json()
        request_id = data.get('request_id')
        
        if not request_id:
            return jsonify({'success': False, 'error': 'Request ID is required'}), 400
        
        client = supabase_admin or supabase
        
        check_response = client.table('leave_requests')\
            .select('*, employees(name, email)')\
            .eq('id', request_id)\
            .execute()
        
        if not _safe_data(check_response):
            return jsonify({'success': False, 'error': 'Leave request not found'}), 404
        
        delete_response = client.table('leave_requests')\
            .delete()\
            .eq('id', request_id)\
            .execute()
        
        return jsonify({
            'success': True,
            'message': 'Leave request deleted successfully'
        })
        
    except Exception as e:
        print(f"Error deleting leave request: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@leave_requests_bp.route('/leave-requests/stats')
def get_leave_stats():
    """Get leave request statistics"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    
    user_role = session.get('user_role')
    if user_role != 'admin':
        return jsonify({'success': False, 'error': 'Admin privileges required'}), 403
    
    try:
        client = supabase_admin or supabase
        response = client.table('leave_requests').select('*').execute()
        leave_requests = _safe_data(response) or []
        
        total = len(leave_requests)
        pending = len([req for req in leave_requests if req['status'] == 'pending'])
        approved = len([req for req in leave_requests if req['status'] == 'approved'])
        rejected = len([req for req in leave_requests if req['status'] == 'rejected'])
        
        leave_types = {}
        for req in leave_requests:
            leave_type = req['leave_type']
            if leave_type not in leave_types:
                leave_types[leave_type] = 0
            leave_types[leave_type] += 1
        
        stats = {
            'total_requests': total,
            'pending_requests': pending,
            'approved_requests': approved,
            'rejected_requests': rejected,
            'leave_types': leave_types
        }
        
        return jsonify({'success': True, 'stats': stats})
        
    except Exception as e:
        print(f"Error fetching stats: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500
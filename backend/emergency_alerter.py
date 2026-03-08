"""
EQUINOX Flood Watch - Emergency Alert System
Sends alerts via SMS and manages human sensor feedback
"""

import logging
import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
import aiohttp
from twilio.rest import Client as TwilioClient

from config import get_config

config = get_config()
logger = logging.getLogger(__name__)

class EmergencyAlerter:
    """
    Emergency alert system for sending SMS alerts
    """
    
    # Alert templates in multiple languages
    ALERT_TEMPLATES = {
        'red': {
            'en': "RED ALERT: Flash flood expected in {village}. Water may reach {depth}cm. EVACUATE to higher ground immediately. Stay safe.",
            'hi': "लाल चेतावनी: {village} में अचानक बाढ़ की आशंका। पानी {depth} सेमी तक पहुंच सकता है। तुरंत ऊंची जगह पर जाएं। सुरक्षित रहें।",
            'mr': "लाल सूचना: {village} मध्ये अचानक पूर येण्याची शक्यता. पाणी {depth} सेमी पर्यंत पोहोचू शकते. त्वरित उंच जागी जा. सुरक्षित रहा."
        },
        'orange': {
            'en': "ORANGE ALERT: High flood risk in {village}. Prepare to evacuate. Monitor water levels. Avoid low-lying areas.",
            'hi': "नारंगी चेतावनी: {village} में उच्च बाढ़ का खतरा। निकासी के लिए तैयार रहें। पानी के स्तर पर नजर रखें। निचले इलाकों से बचें।",
            'mr': "नारिंगी सूचना: {village} मध्ये उच्च पुरधोक. सुटण्यासाठी तयार रहा. पाण्याच्या पातळीवर लक्ष ठेवा. खालच्या भागातून दूर रहा."
        },
        'yellow': {
            'en': "YELLOW ALERT: Moderate flood risk in {village}. Stay alert. Prepare emergency supplies. Avoid crossing flooded roads.",
            'hi': "पीली चेतावनी: {village} में मध्यम बाढ़ का खतरा। सतर्क रहें। आपातकालीन आपूर्ति तैयार करें। बाढ़ग्रस्त सड़कों को पार करने से बचें।",
            'mr': "पिवळी सूचना: {village} मध्ये मध्यम पुरधोक. सतर्क रहा. आणीबाणीचे सामान तयार करा. पुरलेल्या रस्त्यांवरुन जाणे टाळा."
        }
    }
    
    def __init__(self):
        """Initialize emergency alerter"""
        self.sms_provider = getattr(config, 'SMS_PROVIDER', 'twilio')
        self.feedback_dir = os.path.join(config.UPLOAD_DIR, 'reports')
        os.makedirs(self.feedback_dir, exist_ok=True)
        
        # Initialize SMS client if configured
        if config.SMS_API_KEY:
            if self.sms_provider == 'twilio':
                # Twilio requires account_sid, auth_token, and from_number
                # For simplicity, we'll use a generic approach
                self.sms_client = None  # Would initialize TwilioClient here
            else:
                self.sms_client = None
    
    async def send_alert(self, village_name: str, alert_level: str,
                        custom_message: str = '', recipients: Any = 'all',
                        language: str = 'hi') -> Dict[str, Any]:
        """
        Send emergency alert to recipients
        
        Args:
            village_name: Name of village
            alert_level: 'yellow', 'orange', or 'red'
            custom_message: Custom message (optional)
            recipients: List of phone numbers or 'all'
            language: Language code ('en', 'hi', 'mr')
            
        Returns:
            Result dictionary
        """
        try:
            # Validate inputs
            if alert_level not in self.ALERT_TEMPLATES:
                raise ValueError(f"Invalid alert_level: {alert_level}")
            
            if language not in ['en', 'hi', 'mr']:
                language = 'hi'  # Default to Hindi
            
            # Get recipient numbers
            phone_numbers = await self._get_recipient_numbers(recipients, village_name)
            
            if not phone_numbers:
                logger.warning(f"No recipients found for {village_name}")
                return {
                    'status': 'no_recipients',
                    'message': 'No recipients found',
                    'timestamp': datetime.now().isoformat()
                }
            
            # Prepare message
            if custom_message:
                message = custom_message
            else:
                # Use template with default depth
                depth_map = {'red': '100+', 'orange': '50-100', 'yellow': '20-50'}
                message = self.ALERT_TEMPLATES[alert_level][language].format(
                    village=village_name,
                    depth=depth_map[alert_level]
                )
            
            # Add timestamp and source
            timestamp = datetime.now().strftime('%H:%M')
            message += f"\n[{timestamp}] EQUINOX Flood Watch"
            
            # Send SMS to each recipient
            sent_count = 0
            failed_numbers = []
            
            for phone in phone_numbers:
                try:
                    success = await self._send_sms(phone, message)
                    if success:
                        sent_count += 1
                    else:
                        failed_numbers.append(phone)
                except Exception as e:
                    logger.error(f"Failed to send to {phone}: {str(e)}")
                    failed_numbers.append(phone)
            
            # Log the alert
            await self._log_alert(village_name, alert_level, sent_count, failed_numbers)
            
            result = {
                'status': 'success' if sent_count > 0 else 'partial',
                'village': village_name,
                'alert_level': alert_level,
                'message_sent': message[:100] + '...' if len(message) > 100 else message,
                'recipients_total': len(phone_numbers),
                'recipients_success': sent_count,
                'recipients_failed': len(failed_numbers),
                'failed_numbers': failed_numbers[:10],  # Limit for response
                'language': language,
                'timestamp': datetime.now().isoformat()
            }
            
            logger.info(f"Alert sent to {sent_count}/{len(phone_numbers)} recipients")
            
            return result
            
        except Exception as e:
            logger.error(f"Error sending alert: {str(e)}")
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    async def _get_recipient_numbers(self, recipients: Any, village_name: str) -> List[str]:
        """
        Get list of phone numbers for recipients
        
        Args:
            recipients: 'all' or list of numbers
            village_name: Name of village
            
        Returns:
            List of phone numbers
        """
        if recipients == 'all':
            # Get all numbers for village from database
            # For now, return sample numbers
            return self._get_sample_numbers(village_name)
        elif isinstance(recipients, list):
            # Validate phone numbers
            valid_numbers = []
            for number in recipients:
                if self._validate_phone_number(number):
                    valid_numbers.append(number)
            return valid_numbers
        else:
            return []
    
    def _get_sample_numbers(self, village_name: str) -> List[str]:
        """Get sample phone numbers for demonstration"""
        # In production, this would query a database
        sample_numbers = {
            'Jodhpur': ['+911234567890', '+911234567891', '+911234567892'],
            'Barmer': ['+911234567893', '+911234567894'],
            'Jaisalmer': ['+911234567895'],
            'Bikaner': ['+911234567896', '+911234567897']
        }
        
        return sample_numbers.get(village_name, ['+911234567898'])
    
    def _validate_phone_number(self, phone: str) -> bool:
        """Validate phone number format"""
        # Simple validation for Indian numbers
        import re
        pattern = r'^(\+91|91|0)?[6789]\d{9}$'
        return bool(re.match(pattern, str(phone).replace(' ', '').replace('-', '')))
    
    async def _send_sms(self, phone: str, message: str) -> bool:
        """
        Send SMS using configured provider
        
        Args:
            phone: Recipient phone number
            message: Message to send
            
        Returns:
            True if successful, False otherwise
        """
        # For demonstration, simulate SMS sending
        # In production, integrate with Twilio, TextLocal, etc.
        
        logger.info(f"Simulating SMS to {phone}: {message[:50]}...")
        
        # Simulate network delay
        import asyncio
        await asyncio.sleep(0.1)
        
        # Simulate success (90% success rate for demo)
        import random
        success = random.random() > 0.1
        
        if success:
            logger.debug(f"SMS sent successfully to {phone}")
        else:
            logger.warning(f"Failed to send SMS to {phone}")
        
        return success
    
    async def _log_alert(self, village_name: str, alert_level: str,
                        sent_count: int, failed_numbers: List[str]):
        """Log alert to file"""
        try:
            log_entry = {
                'timestamp': datetime.now().isoformat(),
                'village': village_name,
                'alert_level': alert_level,
                'sent_count': sent_count,
                'failed_count': len(failed_numbers),
                'failed_numbers': failed_numbers
            }
            
            log_file = os.path.join(config.LOGS_DIR, 'alerts.json')
            os.makedirs(os.path.dirname(log_file), exist_ok=True)
            
            # Read existing logs
            logs = []
            if os.path.exists(log_file):
                with open(log_file, 'r') as f:
                    try:
                        logs = json.load(f)
                    except json.JSONDecodeError:
                        logs = []
            
            # Add new log
            logs.append(log_entry)
            
            # Keep only last 1000 logs
            if len(logs) > 1000:
                logs = logs[-1000:]
            
            # Save
            with open(log_file, 'w') as f:
                json.dump(logs, f, indent=2)
            
        except Exception as e:
            logger.error(f"Error logging alert: {str(e)}")
    
    async def save_feedback(self, feedback_data: Dict[str, Any]) -> str:
        """
        Save human sensor feedback
        
        Args:
            feedback_data: Feedback data dictionary
            
        Returns:
            Feedback ID
        """
        try:
            # Generate unique ID
            import uuid
            feedback_id = str(uuid.uuid4())[:8]
            
            # Add metadata
            feedback_data['feedback_id'] = feedback_id
            feedback_data['received_at'] = datetime.now().isoformat()
            
            # Save to file
            date_str = datetime.now().strftime('%Y-%m-%d')
            day_dir = os.path.join(self.feedback_dir, date_str)
            os.makedirs(day_dir, exist_ok=True)
            
            feedback_file = os.path.join(day_dir, f'{feedback_id}.json')
            
            with open(feedback_file, 'w') as f:
                json.dump(feedback_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Feedback saved: {feedback_id}")
            
            return feedback_id
            
        except Exception as e:
            logger.error(f"Error saving feedback: {str(e)}")
            raise
    
    async def get_feedback(self, village_name: str = None,
                          start_date: datetime = None,
                          end_date: datetime = None) -> List[Dict[str, Any]]:
        """
        Get human sensor feedback
        
        Args:
            village_name: Filter by village name
            start_date: Start date for filtering
            end_date: End date for filtering
            
        Returns:
            List of feedback entries
        """
        try:
            feedback_list = []
            
            # Walk through feedback directory
            for root, dirs, files in os.walk(self.feedback_dir):
                for file in files:
                    if file.endswith('.json'):
                        file_path = os.path.join(root, file)
                        
                        try:
                            with open(file_path, 'r') as f:
                                feedback = json.load(f)
                            
                            # Apply filters
                            if village_name:
                                # Check if feedback is for this village
                                # This would need location-to-village mapping
                                pass
                            
                            if start_date:
                                feedback_time = datetime.fromisoformat(feedback['received_at'])
                                if feedback_time < start_date:
                                    continue
                            
                            if end_date:
                                feedback_time = datetime.fromisoformat(feedback['received_at'])
                                if feedback_time > end_date:
                                    continue
                            
                            feedback_list.append(feedback)
                            
                        except Exception as e:
                            logger.warning(f"Error reading feedback file {file_path}: {str(e)}")
            
            # Sort by timestamp
            feedback_list.sort(key=lambda x: x.get('received_at', ''), reverse=True)
            
            return feedback_list[:100]  # Limit to 100 entries
            
        except Exception as e:
            logger.error(f"Error getting feedback: {str(e)}")
            return []
    
    async def send_test_alert(self, phone: str) -> Dict[str, Any]:
        """
        Send test alert to a phone number
        
        Args:
            phone: Phone number to send test to
            
        Returns:
            Result dictionary
        """
        test_message = {
            'en': "TEST: This is a test message from EQUINOX Flood Watch System. Please ignore.",
            'hi': "टेस्ट: यह EQUINOX बाढ़ पूर्व चेतावनी प्रणाली से एक परीक्षण संदेश है। कृपया अनदेखा करें।",
            'mr': "चाचणी: हा EQUINOX पूर इशारा प्रणाली कडून एक चाचणी संदेश आहे. कृपया दुर्लक्ष करा."
        }
        
        try:
            # Send test in all languages
            results = []
            for lang, message in test_message.items():
                success = await self._send_sms(phone, message)
                results.append({
                    'language': lang,
                    'success': success,
                    'message': message
                })
            
            return {
                'status': 'test_completed',
                'phone': phone,
                'results': results,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error sending test alert: {str(e)}")
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html })
    });
    const result = await response.json();
    if (result.success) {
      console.log(`Email sent successfully to ${to}`);
      return true;
    } else {
      console.warn(`Email failed to ${to}:`, result.message);
      return false;
    }
  } catch (err) {
    console.error(`Error sending email to ${to}:`, err);
    return false;
  }
};

export const getWelcomeEmailTemplate = (name: string, email: string, password: string, course?: string, batch?: string, phone?: string) => `
  <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
    <h2 style="color: #4f8ef7;">Welcome to Core LMS!</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your student account has been successfully created. You can now log in to access your courses and learning materials.</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; font-size: 16px;">Your Login Credentials:</h3>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
    </div>

    <p><strong>Additional Details:</strong></p>
    <ul>
      <li><strong>Course:</strong> ${course || 'N/A'}</li>
      <li><strong>Batch:</strong> ${batch || 'N/A'}</li>
      <li><strong>Phone:</strong> ${phone || 'N/A'}</li>
    </ul>

    <p>Please keep your password secure. We recommend changing it after your first login.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
      <p>Sent from Core LMS Admin Panel</p>
    </div>
  </div>
`;

export const getTeacherWelcomeEmailTemplate = (name: string, email: string, password: string, subject?: string, phone?: string) => `
  <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
    <h2 style="color: #4f8ef7;">Welcome to Core LMS - Teacher Portal!</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your teacher account has been successfully created. You can now log in to manage your courses and students.</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; font-size: 16px;">Your Login Credentials:</h3>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
    </div>

    <p><strong>Additional Details:</strong></p>
    <ul>
      <li><strong>Subject Specialization:</strong> ${subject || 'N/A'}</li>
      <li><strong>Phone:</strong> ${phone || 'N/A'}</li>
    </ul>

    <p>Please keep your password secure. We recommend changing it after your first login.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
      <p>Sent from Core LMS Admin Panel</p>
    </div>
  </div>
`;

export const getPaymentEmailTemplate = (name: string, amount: string, date: string, method: string, status: string) => `
  <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
    <h2 style="color: #4f8ef7;">Payment Notification - Core LMS</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>This is a notification regarding a payment record for your account.</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; font-size: 16px;">Payment Details:</h3>
      <p style="margin: 5px 0;"><strong>Amount:</strong> ₹${amount}</p>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
      <p style="margin: 5px 0;"><strong>Method:</strong> ${method}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${status === 'Paid' ? '#28a745' : '#ffc107'}; font-weight: bold;">${status}</span></p>
    </div>

    <p>If you have any questions, please contact the administration.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
      <p>Sent from Core LMS Admin Panel</p>
    </div>
  </div>
`;

export const getUpdateNotificationTemplate = (name: string, module: string, action: string, details: string) => `
  <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
    <h2 style="color: #4f8ef7;">Account Update Notification</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your <strong>${module}</strong> record has been <strong>${action}</strong>.</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; font-size: 16px;">Update Details:</h3>
      <p style="margin: 5px 0;">${details}</p>
    </div>

    <p>If you did not expect this change, please contact the administration immediately.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
      <p>Sent from Core LMS Admin Panel</p>
    </div>
  </div>
`;

export const getNewRecordTemplate = (module: string, name: string, details: string) => `
  <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
    <h2 style="color: #4f8ef7;">New ${module} Added</h2>
    <p>A new <strong>${module}</strong> has been added to the system.</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; font-size: 16px;">Details:</h3>
      <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
      <p style="margin: 5px 0;">${details}</p>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
      <p>Sent from Core LMS Admin Panel</p>
    </div>
  </div>
`;

export const getAttendanceEmailTemplate = (name: string, date: string, status: string, batchName: string) => `
  <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
    <h2 style="color: #4f8ef7;">Attendance Notification - Core LMS</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your attendance for <strong>${date}</strong> has been recorded.</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; font-size: 16px;">Attendance Details:</h3>
      <p style="margin: 5px 0;"><strong>Batch:</strong> ${batchName}</p>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${status === 'Present' ? '#28a745' : '#dc3545'}; font-weight: bold;">${status}</span></p>
    </div>

    <p>If you have any questions, please contact the administration.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
      <p>Sent from Core LMS Admin Panel</p>
    </div>
  </div>
`;

export const getExamResultEmailTemplate = (name: string, examTitle: string, score: number, totalMarks: number, percentage: number, status: string) => `
  <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
    <h2 style="color: #4f8ef7;">Exam Result - Core LMS</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your results for the exam <strong>${examTitle}</strong> are now available.</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; font-size: 16px;">Result Summary:</h3>
      <p style="margin: 5px 0;"><strong>Score:</strong> ${score} / ${totalMarks}</p>
      <p style="margin: 5px 0;"><strong>Percentage:</strong> ${percentage}%</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${status === 'Pass' ? '#28a745' : '#dc3545'}; font-weight: bold;">${status}</span></p>
    </div>

    <p>${status === 'Pass' ? 'Congratulations on passing the exam!' : 'Keep practicing and try again. You can do it!'}</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
      <p>Sent from Core LMS Admin Panel</p>
    </div>
  </div>
`;

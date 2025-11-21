/**
 * Email Service
 * Handles sending email notifications to customers
 * Uses Vercel Serverless Functions
 */

export interface EmailResult {
    success: boolean;
    error?: any;
}

/**
 * Send a tracking number email to a customer
 * @param to Customer's email address
 * @param trackingNumber The generated tracking number
 * @param customerName Customer's name
 */
export async function sendTrackingEmail(
    to: string,
    trackingNumber: string,
    customerName: string
): Promise<EmailResult> {
    try {
        // Determine API URL - Vercel automatically serves API routes from the same domain
        // In development, use localhost. In production, Vercel will use the deployed domain
        const apiUrl = typeof window !== 'undefined' 
            ? `${window.location.origin}/api/send-email`
            : '/api/send-email';

        console.log('📧 Sending tracking email to:', to);
        console.log('🚀 Using email API URL:', apiUrl);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to,
                trackingNumber,
                customerName,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('❌ Email API error:', errorData);
            throw new Error(errorData.error || `Failed to send email: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Email sent successfully:', result);
        return { success: result.success || true };
    } catch (error: any) {
        console.error('Error sending tracking email:', error);
        return { success: false, error: error.message || error };
    }
}

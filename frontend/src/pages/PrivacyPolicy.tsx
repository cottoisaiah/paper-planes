import React from 'react';
import { Container, Typography, Box, Paper, Divider } from '@mui/material';

const PrivacyPolicy: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Privacy Policy
        </Typography>
        
        <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
          Last updated: September 2, 2025
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ '& > *': { mb: 3 } }}>
          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              1. Introduction
            </Typography>
            <Typography variant="body1" paragraph>
              Paper Planes ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our social media analytics and content creation platform.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              2. Information We Collect
            </Typography>
            
            <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2 }}>
              2.1 Personal Information
            </Typography>
            <Typography variant="body1" paragraph>
              We may collect personal information that you voluntarily provide, including:
            </Typography>
            <Typography component="ul" variant="body1" sx={{ pl: 2 }}>
              <li>Name and email address</li>
              <li>Account credentials for our platform</li>
              <li>Payment and billing information (processed securely through Stripe)</li>
              <li>Communication preferences</li>
            </Typography>

            <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2 }}>
              2.2 Social Media Data
            </Typography>
            <Typography variant="body1" paragraph>
              When you connect your social media accounts, we collect:
            </Typography>
            <Typography component="ul" variant="body1" sx={{ pl: 2 }}>
              <li>Public profile information (username, display name, bio)</li>
              <li>Follower and following lists</li>
              <li>Post content, engagement metrics, and publishing history</li>
              <li>Account statistics and performance data</li>
            </Typography>

            <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 2 }}>
              2.3 Usage Data
            </Typography>
            <Typography variant="body1" paragraph>
              We automatically collect information about your use of our service:
            </Typography>
            <Typography component="ul" variant="body1" sx={{ pl: 2 }}>
              <li>Log data (IP address, browser type, pages visited)</li>
              <li>Device information and technical specifications</li>
              <li>Usage patterns and feature interactions</li>
              <li>Analytics data and performance metrics</li>
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              3. How We Use Your Information
            </Typography>
            <Typography variant="body1" paragraph>
              We use the collected information for the following purposes:
            </Typography>
            <Typography component="ul" variant="body1" sx={{ pl: 2 }}>
              <li>Providing and maintaining our analytics and content creation services</li>
              <li>Generating insights and recommendations based on your social media data</li>
              <li>Processing payments and managing subscriptions</li>
              <li>Improving our AI content generation algorithms</li>
              <li>Communicating with you about our services</li>
              <li>Ensuring platform security and preventing fraud</li>
              <li>Complying with legal obligations</li>
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              4. Information Sharing and Disclosure
            </Typography>
            <Typography variant="body1" paragraph>
              We do not sell, trade, or rent your personal information. We may share information in the following circumstances:
            </Typography>
            <Typography component="ul" variant="body1" sx={{ pl: 2 }}>
              <li><strong>Service Providers:</strong> Trusted third parties who assist in operating our platform (e.g., Stripe for payments, cloud hosting providers)</li>
              <li><strong>Legal Requirements:</strong> When required by law, legal process, or government request</li>
              <li><strong>Safety and Security:</strong> To protect the rights, safety, and security of our users and platform</li>
              <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              5. Data Security
            </Typography>
            <Typography variant="body1" paragraph>
              We implement appropriate technical and organizational measures to protect your information:
            </Typography>
            <Typography component="ul" variant="body1" sx={{ pl: 2 }}>
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication and access controls</li>
              <li>Regular security assessments and updates</li>
              <li>Limited access to personal data on a need-to-know basis</li>
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              6. Third-Party Services
            </Typography>
            <Typography variant="body1" paragraph>
              Our platform integrates with third-party services:
            </Typography>
            <Typography component="ul" variant="body1" sx={{ pl: 2 }}>
              <li><strong>Social Media Platforms:</strong> We access data through official APIs (X/Twitter, etc.) in accordance with their terms and your permissions</li>
              <li><strong>Payment Processing:</strong> Stripe processes payments securely; we do not store complete payment card information</li>
              <li><strong>AI Services:</strong> We use AI providers for content generation while maintaining data privacy</li>
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              7. Data Retention
            </Typography>
            <Typography variant="body1" paragraph>
              We retain your information only as long as necessary to provide our services and comply with legal obligations. You may request deletion of your account and associated data at any time.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              8. Your Rights and Choices
            </Typography>
            <Typography variant="body1" paragraph>
              You have the following rights regarding your personal information:
            </Typography>
            <Typography component="ul" variant="body1" sx={{ pl: 2 }}>
              <li>Access and review your personal data</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Delete your account and personal data</li>
              <li>Disconnect social media accounts</li>
              <li>Opt out of marketing communications</li>
              <li>Data portability (export your data)</li>
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              9. Children's Privacy
            </Typography>
            <Typography variant="body1" paragraph>
              Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will take steps to delete the information.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              10. International Data Transfers
            </Typography>
            <Typography variant="body1" paragraph>
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for international transfers.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              11. Changes to This Privacy Policy
            </Typography>
            <Typography variant="body1" paragraph>
              We may update this Privacy Policy periodically. We will notify you of any material changes by posting the new policy on our platform and updating the "Last updated" date.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              12. Contact Us
            </Typography>
            <Typography variant="body1" paragraph>
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </Typography>
            <Typography variant="body1">
              Email: privacy@paper-planes.redexct.xyz<br />
              Website: https://paper-planes.redexct.xyz<br />
              Address: Paper Planes Privacy Team
            </Typography>
          </section>
        </Box>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicy;

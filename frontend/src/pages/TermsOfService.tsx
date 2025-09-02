import React from 'react';
import { Container, Typography, Box, Paper, Divider } from '@mui/material';

const TermsOfService: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={1} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Terms of Service
        </Typography>
        
        <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
          Last updated: September 2, 2025
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ '& > *': { mb: 3 } }}>
          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              1. Acceptance of Terms
            </Typography>
            <Typography variant="body1" paragraph>
              By accessing and using Paper Planes ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              2. Description of Service
            </Typography>
            <Typography variant="body1" paragraph>
              Paper Planes is a social media analytics and content creation platform that provides:
            </Typography>
            <Typography component="ul" variant="body1" sx={{ pl: 2 }}>
              <li>Social media analytics and insights</li>
              <li>AI-powered content generation tools</li>
              <li>Engagement tracking and reporting</li>
              <li>Subscription-based premium features</li>
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              3. User Accounts and Authentication
            </Typography>
            <Typography variant="body1" paragraph>
              To access certain features, you must create an account and connect your social media accounts. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              4. Data Collection and Social Media Integration
            </Typography>
            <Typography variant="body1" paragraph>
              Our service integrates with social media platforms (including X/Twitter) to provide analytics and insights. By connecting your accounts, you authorize us to:
            </Typography>
            <Typography component="ul" variant="body1" sx={{ pl: 2 }}>
              <li>Access your public profile information</li>
              <li>Retrieve your follower and following lists</li>
              <li>Analyze your post engagement metrics</li>
              <li>Generate content recommendations based on your data</li>
            </Typography>
            <Typography variant="body1" paragraph>
              We only access data necessary for providing our services and in accordance with the permissions you grant.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              5. Subscription and Payment Terms
            </Typography>
            <Typography variant="body1" paragraph>
              Premium features are available through subscription plans. Payment processing is handled securely through Stripe. Subscriptions automatically renew unless cancelled. Refunds are handled according to our refund policy.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              6. AI Content Generation
            </Typography>
            <Typography variant="body1" paragraph>
              Our AI content generation features are provided for convenience and creativity enhancement. Users are responsible for reviewing and approving all AI-generated content before publishing. We do not guarantee the accuracy, appropriateness, or effectiveness of AI-generated content.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              7. Prohibited Uses
            </Typography>
            <Typography variant="body1" paragraph>
              You agree not to use the service for:
            </Typography>
            <Typography component="ul" variant="body1" sx={{ pl: 2 }}>
              <li>Spam, harassment, or abusive behavior</li>
              <li>Violating any applicable laws or regulations</li>
              <li>Attempting to reverse engineer or compromise our systems</li>
              <li>Creating fake accounts or impersonating others</li>
              <li>Distributing malware or malicious content</li>
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              8. Intellectual Property
            </Typography>
            <Typography variant="body1" paragraph>
              The service and its original content, features, and functionality are owned by Paper Planes and are protected by international copyright, trademark, and other intellectual property laws.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              9. Limitation of Liability
            </Typography>
            <Typography variant="body1" paragraph>
              In no event shall Paper Planes be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              10. Termination
            </Typography>
            <Typography variant="body1" paragraph>
              We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              11. Changes to Terms
            </Typography>
            <Typography variant="body1" paragraph>
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
            </Typography>
          </section>

          <section>
            <Typography variant="h5" component="h2" gutterBottom>
              12. Contact Information
            </Typography>
            <Typography variant="body1" paragraph>
              If you have any questions about these Terms of Service, please contact us at:
            </Typography>
            <Typography variant="body1">
              Email: support@paper-planes.redexct.xyz<br />
              Website: https://paper-planes.redexct.xyz
            </Typography>
          </section>
        </Box>
      </Paper>
    </Container>
  );
};

export default TermsOfService;

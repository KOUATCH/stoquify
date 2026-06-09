import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text
} from '@react-email/components';


interface InvitationEmailProps {
  companyName: string | null;
  name: string;
  linkUrl: string;
}

export const UserInvitation = ({ companyName, linkUrl, name }
  : InvitationEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Preview>Join the  {companyName ?? ""} team as {name}</Preview>
      <Container style={container}>
        <Img
          src={'/images/dash.webp'}
          width="40"
          height="40"
          alt="Linear"
          style={logo}
        />
        <Heading style={heading}>Join the  {companyName} team as  {name} </Heading>
        <Section style={buttonContainer}>
          <Button style={button} href={linkUrl}>Join the  {companyName} team.
          </Button>
        </Section>
        <Text style={paragraph}>
          Hello,
        </Text>
        <Text style={paragraph}>
          You have been invited to join the {companyName} team in the role of {name}.
          We are excited to have you in our team.
        </Text>
        <Text style={paragraph}>
          Please click the button below to customize your account and complete your onboarding process.
        </Text>
        <Text style={paragraph}>
          Once you setup your account you will gain access to all the tools you need to excel in your role.
        </Text>
        <Text style={paragraph}>
          If you have any questions please contact our HR department.
        </Text>
        <Text style={paragraph}>
          We look forward to working with you.
        </Text>

      </Container>
    </Body>
  </Html>
);

export default UserInvitation;

const logo = {
  borderRadius: 21,
  width: 42,
  height: 42,
};

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
};

const heading = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '400',
  color: '#484848',
  padding: '17px 0 0',
};

const paragraph = {
  margin: '0 0 15px',
  fontSize: '15px',
  lineHeight: '1.4',
  color: '#3c4149',
};

const buttonContainer = {
  padding: '27px 0 27px',
};

const button = {
  backgroundColor: '#5e6ad2',
  borderRadius: '3px',
  fontWeight: '600',
  color: '#fff',
  fontSize: '15px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '11px 23px',
};

const reportLink = {
  fontSize: '14px',
  color: '#b4becc',
};

const hr = {
  borderColor: '#dfe1e4',
  margin: '42px 0 26px',
};

const code = {
  fontFamily: 'monospace',
  fontWeight: '700',
  padding: '1px 4px',
  backgroundColor: '#dfe1e4',
  letterSpacing: '-0.3px',
  fontSize: '21px',
  borderRadius: '4px',
  color: '#3c4149',
};

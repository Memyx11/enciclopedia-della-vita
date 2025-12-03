import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a'
    }}>
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: {
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
            }
          }
        }}
      />
    </div>
  )
}

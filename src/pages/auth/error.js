import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

const ERROR_MESSAGES = {
  'Configuration': 'OAuth configuration error. Please check your settings.',
  'AccessDenied': 'Access was denied. Please try signing in with a different account.',
  'Verification': 'Email verification error. Please try again.',
  'OAuthSignin': 'Error during OAuth sign-in process. Please try again.',
  'Default': 'An unexpected authentication error occurred.'
};

export default function AuthError({ error }) {
  const router = useRouter();
  const errorMessage = ERROR_MESSAGES[error] || ERROR_MESSAGES.Default;

  return (
    <>
      <Head>
        <title>Authentication Error | Dify</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">
                Authentication Failed
              </h1>
              
              <div className="rounded-md bg-red-50 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Link 
                  href="/auth/signin"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  return {
    props: {
      error: context.query.error || 'Unknown error',
    },
  };
} 
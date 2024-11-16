import { getProviders, signIn } from "next-auth/react";
import { useState } from "react";
import Layout from '../../components/Layout';
import ErrorMessage from '../../components/ErrorMessage';

export default function SignIn({ providers }) {
  const [error, setError] = useState("");

  const handleSignIn = async (providerId) => {
    try {
      const result = await signIn(providerId, {
        callbackUrl: "/",
        redirect: false
      });
      
      if (result?.error) {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to sign in. Please try again.");
    }
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <h1 className="text-4xl font-bold mb-8">Sign in to Dify Frontend</h1>
        {error && <ErrorMessage message={error} className="mb-4" />}
        {Object.values(providers || {}).map((provider) => (
          <div key={provider.name}>
            <button
              onClick={() => handleSignIn(provider.id)}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Sign in with {provider.name}
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  const providers = await getProviders();
  return {
    props: { providers },
  };
}
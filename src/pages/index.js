import { useSession, signIn } from "next-auth/react";
import Layout from '../components/Layout';
import RunWorkflow from '../components/RunWorkflow';
import Parameters from '../components/Parameters';
import SignOut from '../components/SignOut';

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <h1 className="text-4xl font-bold mb-8">Welcome to Dify Frontend</h1>
          <button
            onClick={() => signIn('github')}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Sign in with GitHub
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-end mb-8">
          <SignOut />
        </div>
        <RunWorkflow />
        <Parameters />
      </div>
    </Layout>
  );
}
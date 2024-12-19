import Layout from '../components/Layout';
import WorkflowForm from '../components/WorkflowForm';

export default function WorkflowPage() {
  return (
    <Layout>
      <div className="py-8">
        <WorkflowForm />
      </div>
    </Layout>
  );
}
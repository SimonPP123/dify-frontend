import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Parameters() {
  const [parameters, setParameters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchParameters() {
      try {
        const response = await axios.get('/api/dify/parameters');
        setParameters(response.data);
      } catch (err) {
        setError('Failed to fetch parameters');
        console.error('Parameters Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchParameters();
  }, []);

  if (loading) return <div>Loading parameters...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Application Parameters</h2>
      <div className="bg-gray-50 p-4 rounded-md">
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(parameters, null, 2)}
        </pre>
      </div>
    </div>
  );
} 
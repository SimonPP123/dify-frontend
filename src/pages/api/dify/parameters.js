import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await axios.get(
      `${process.env.DIFY_API_URL}/parameters`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DIFY_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Parameters Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch parameters",
    });
  }
} 
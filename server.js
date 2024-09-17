require('dotenv').config();  // Load environment variables from .env file

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const { LanguageServiceClient } = require('@google-cloud/language');

// The credentials file should also be in the .env file
process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS_PATH;

const app = express();
const port = 5001;

app.use(cors({
    origin: 'http://localhost:3000',
}));

app.use(bodyParser.json());

const languageClient = new LanguageServiceClient();

const apiKey = process.env.OPENAI_API_KEY;  // Pull OpenAI API key from .env
const assistantId = process.env.OPENAI_ASSISTANT_ID;  // Pull Assistant ID from .env
const giphyApiKey = process.env.GIPHY_API_KEY;  // Pull Giphy API key from .env
let threadId = null;

const analyzeSentiment = async (text) => {
    const document = {
        content: text,
        type: 'PLAIN_TEXT',
    };

    const [result] = await languageClient.analyzeSentiment({ document });
    const sentiment = result.documentSentiment;
    console.log('Sentiment analysis:', sentiment);

    return sentiment; 
};

const getGifForSentiment = async (sentimentScore) => {
    let gifQuery = '';

    if (sentimentScore > 0.1) {
        gifQuery = 'happy';
    } else if (sentimentScore < -0.1) {
        gifQuery = 'comforting';
    } else {
        return null;  
    }

    try {
        // Generate a random offset to vary the GIF results
        const randomOffset = Math.floor(Math.random() * 50);  // Adjust the range as needed

        const response = await axios.get(`https://api.giphy.com/v1/gifs/search`, {
            params: {
                api_key: giphyApiKey,
                q: gifQuery,
                limit: 1,           // Still retrieve only 1 GIF
                offset: randomOffset 
            }
        });
        
        const gifUrl = response.data.data[0]?.images?.downsized_medium?.url;
        return gifUrl || null;
    } catch (error) {
        console.error('Error fetching GIF:', error.response?.data || error.message);
        return null;
    }
};

const createThread = async () => {
    if (!threadId) {
        try {
            const response = await axios.post('https://api.openai.com/v1/threads', {}, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'OpenAI-Beta': 'assistants=v2'
                }
            });
            threadId = response.data.id;
            console.log('Thread created with ID:', threadId);
        } catch (error) {
            console.error('Error creating thread:', error.response?.data || error.message);
            throw error;
        }
    }
    return threadId;
};

// Wait for the assistant's response
const waitOnRun = async (runId) => {
    let runStatus;
    do {
        const response = await axios.get(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });
        runStatus = response.data.status;
        await new Promise((resolve) => setTimeout(resolve, 500));
    } while (runStatus === 'queued' || runStatus === 'in_progress');
    
    return runStatus;
};

// API route for interacting with the assistant and sentiment analysis
app.post('/chat', async (req, res) => {
    const userInput = req.body.prompt;
    if (!userInput) {
        return res.status(400).json({ error: 'No input provided' });
    }

    try {
        // Analyze sentiment of user input
        const sentiment = await analyzeSentiment(userInput);

        const gifUrl = await getGifForSentiment(sentiment.score);

        await createThread();

        const messageResponse = await axios.post(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            role: 'user',
            content: userInput
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });

        const messageId = messageResponse.data.id;

        const runResponse = await axios.post(`https://api.openai.com/v1/threads/${threadId}/runs`, {
            assistant_id: assistantId
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            }
        });

        const runId = runResponse.data.id;

        // Wait for the assistant to process the request
        await waitOnRun(runId);

        // Retrieve the assistant's response
        const messagesResponse = await axios.get(`https://api.openai.com/v1/threads/${threadId}/messages`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'OpenAI-Beta': 'assistants=v2'
            },
            params: {
                order: 'asc',
                after: messageId
            }
        });

        const assistantResponse = messagesResponse.data.data[0].content[0].text.value;

        // Return the assistant's response, sentiment, and optional GIF
        res.json({ 
            assistant_response: assistantResponse, 
            sentiment: sentiment,
            gifUrl: gifUrl  // Include GIF URL if applicable
        });

    } catch (error) {
        console.error('Error interacting with assistant:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to interact with the assistant' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

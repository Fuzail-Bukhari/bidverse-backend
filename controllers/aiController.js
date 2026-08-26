import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const generateListing = async (req, res) => {
  try {
    const { keywords } = req.body;
    const imageFile = req.file;

    if (!keywords && !imageFile) {
      return res.status(400).json({
        success: false,
        message: "Please provide keywords or an image",
      });
    }

    // Build message content
    const messageContent = [];

    // Add image if provided
    if (imageFile) {
      const imageBuffer = fs.readFileSync(imageFile.path);
      const base64Image = imageBuffer.toString("base64");
      const mediaType = imageFile.mimetype;

      messageContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: base64Image,
        },
      });

      // Clean up temp file
      fs.unlinkSync(imageFile.path);
    }

    // Add text prompt
    messageContent.push({
      type: "text",
      text: `You are an expert auction listing writer for a premium auction platform called BidVerse.
      
${imageFile ? "Analyze this product image carefully." : ""}
${keywords ? `The seller described their item as: "${keywords}"` : ""}

Generate a compelling auction listing with the following information. Return ONLY a valid JSON object with no markdown, no backticks, no explanation — just raw JSON:

{
  "title": "A compelling, specific product title (max 60 chars)",
  "description": "A detailed, persuasive description highlighting key features, condition, and why buyers should bid (150-200 words)",
  "category": "One of: Electronics, Fashion, Vehicles, Furniture, Art, Sports, Other",
  "suggestedStartingPrice": <a number in USD based on typical market value>,
  "condition": "One of: New, Like New, Good, Fair, Poor",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "highlights": ["key feature 1", "key feature 2", "key feature 3"],
  "sellerTips": "One sentence tip for the seller to maximize bids"
}

Make the title and description sound premium and professional. Be specific and accurate based on what you can see/read.`,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: messageContent,
        },
      ],
    });

    const rawText = response.content[0].text.trim();

    // Parse JSON response
    let listing;
    try {
      listing = JSON.parse(rawText);
    } catch {
      // Try to extract JSON if there's extra text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        listing = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI response");
      }
    }

    res.status(200).json({
      success: true,
      listing,
    });
  } catch (err) {
    console.error("AI Error:", err.message);
    res.status(500).json({
      success: false,
      message: "AI generation failed. Please try again.",
    });
  }
};

export const suggestBid = async (req, res) => {
  try {
    const { currentPrice, totalBids, timeRemaining, category, startingPrice } = req.body;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are a smart bidding assistant for an auction platform.

Auction details:
- Category: ${category}
- Starting Price: $${startingPrice}
- Current Price: $${currentPrice}
- Total Bids: ${totalBids}
- Time Remaining: ${timeRemaining}

Analyze this auction and return ONLY a valid JSON object with no markdown:

{
  "suggestedBid": <recommended bid amount as number>,
  "minBid": <minimum competitive bid>,
  "maxRecommended": <maximum you'd recommend spending>,
  "confidence": "High/Medium/Low",
  "reasoning": "One sentence explanation",
  "strategy": "One sentence bidding strategy tip"
}`,
        },
      ],
    });

    const rawText = response.content[0].text.trim();
    let suggestion;
    try {
      suggestion = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI response");
      }
    }

    res.status(200).json({ success: true, suggestion });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "AI suggestion failed",
    });
  }
};

export const predictPrice = async (req, res) => {
  try {
    const { title, category, currentPrice, totalBids, timeRemaining, startingPrice } = req.body;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are a price prediction expert for online auctions.

Auction: "${title}"
Category: ${category}
Starting Price: $${startingPrice}
Current Price: $${currentPrice}
Total Bids So Far: ${totalBids}
Time Remaining: ${timeRemaining}

Predict the final selling price. Return ONLY valid JSON with no markdown:

{
  "predictedPrice": <most likely final price as number>,
  "rangeLow": <conservative estimate>,
  "rangeHigh": <optimistic estimate>,
  "confidence": "High/Medium/Low",
  "trend": "Rising/Stable/Slowing",
  "insight": "One sentence market insight"
}`,
        },
      ],
    });

    const rawText = response.content[0].text.trim();
    let prediction;
    try {
      prediction = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        prediction = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI response");
      }
    }

    res.status(200).json({ success: true, prediction });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Price prediction failed",
    });
  }
};
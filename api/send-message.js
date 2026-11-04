
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Keep these values identical to the NodeMCU sketch.
const SCROLL_INTERVAL_MS = 300;
const MINIMUM_DURATION_MS = 30000;
const MAXIMUM_DURATION_MS = 45000;
const MESSAGE_BUFFER_MS = 3300;

// Calculate the display duration for a message.
function calculateMessageDuration(name, message) {
  const scrollingLength =
    16 + name.length + 2 + message.length + 16;

  const scrollSteps = scrollingLength - 15;

  const completeScrollTime =
    scrollSteps * SCROLL_INTERVAL_MS;

  const calculatedDuration =
    completeScrollTime + MESSAGE_BUFFER_MS;

  return Math.min(
    MAXIMUM_DURATION_MS,
    Math.max(MINIMUM_DURATION_MS, calculatedDuration)
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed."
    });
  }

  try {
    const { name, message } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof message !== "string" ||
      !name.trim() ||
      !message.trim() ||
      name.trim().length > 60 ||
      message.trim().length > 60
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a name and message (maximum 60 characters each)."
      });
    }

    const cleanName = name.trim();
    const cleanMessage = message.trim();

    // Calculate the duration required for the new message.
    const newMessageDuration = calculateMessageDuration(
      cleanName,
      cleanMessage
    );

    // Read the currently displayed message.
    const { data: current, error: readError } = await supabase
      .from("watch_message")
      .select("name, message, updated_at")
      .eq("id", 1)
      .single();

    if (readError) {
      throw readError;
    }

    // Calculate how long the previous message needs to be displayed.
    const previousName = current.name || "Be";
    const previousMessage = current.message || "kind";

    const previousMessageDuration = calculateMessageDuration(
      previousName,
      previousMessage
    );

    // Calculate the remaining cooldown for the previous message.
    const lastUpdated = new Date(current.updated_at).getTime();

    const elapsedMilliseconds = Math.max(
      0,
      Date.now() - lastUpdated
    );

    const remainingMilliseconds = Math.max(
      0,
      previousMessageDuration - elapsedMilliseconds
    );

    const remainingSeconds = Math.ceil(
      remainingMilliseconds / 1000
    );

    // Prevent another message until the previous message's
    // calculated display duration has finished.
    if (remainingSeconds > 0) {
      return res.status(429).json({
        success: false,
        message: "Someone has recently sent a message. Please wait.",
        remainingSeconds
      });
    }

    // Send the new message to Supabase.
    const { error: updateError } = await supabase
      .from("watch_message")
      .update({
        name: cleanName,
        message: cleanMessage,
        updated_at: new Date().toISOString()
      })
      .eq("id", 1);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      success: true,
      message: "Your message has been sent to the watch!",
      cooldownSeconds: Math.ceil(
        newMessageDuration / 1000
      )
    });

  } catch (error) {
    console.error("Send message error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send your message. Please try again."
    });
  }
}


import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// These must match the Arduino sketch.
const SCROLL_INTERVAL_MS = 300;
const SUPABASE_POLL_INTERVAL_MS = 3000;
const NETWORK_BUFFER_MS = 1000;

// Calculate the time required for one complete LCD scroll.
function calculateMessageDuration(name, message) {
  // Arduino text:
  // 16 leading spaces + name + ": " + message + 16 trailing spaces.
  //
  // Arduino String.length() counts UTF-8 bytes, so use byte length
  // here to keep the Vercel calculation consistent.

  const nameLength = Buffer.byteLength(name, "utf8");
  const messageLength = Buffer.byteLength(message, "utf8");

  const scrollingLength =
    16 + nameLength + 2 + messageLength + 16;

  const scrollSteps = Math.max(
    0,
    scrollingLength - 15
  );

  return scrollSteps * SCROLL_INTERVAL_MS;
}

// Calculate the server-side cooldown.
// The extra time allows the ESP8266 to receive the message
// before another message is accepted.
function calculateCooldown(name, message) {
  return (
    calculateMessageDuration(name, message) +
    SUPABASE_POLL_INTERVAL_MS +
    NETWORK_BUFFER_MS
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

    // Read the currently stored message.
    const { data: current, error: readError } = await supabase
      .from("watch_message")
      .select("name, message, updated_at")
      .eq("id", 1)
      .single();

    if (readError) {
      throw readError;
    }

    // Calculate how long the previous message needs to scroll.
    const previousName = current.name || "Be";
    const previousMessage = current.message || "kind";

    const previousCooldown = calculateCooldown(
      previousName,
      previousMessage
    );

    const lastUpdated = new Date(current.updated_at).getTime();

    if (!Number.isFinite(lastUpdated)) {
      throw new Error("Invalid updated_at timestamp in Supabase.");
    }

    const elapsedMilliseconds = Math.max(
      0,
      Date.now() - lastUpdated
    );

    const remainingMilliseconds = Math.max(
      0,
      previousCooldown - elapsedMilliseconds
    );

    const remainingSeconds = Math.ceil(
      remainingMilliseconds / 1000
    );

    // Prevent another message until the previous one has
    // completed its full scroll and the polling allowance has passed.
    if (remainingMilliseconds > 0) {
      return res.status(429).json({
        success: false,
        message: "The previous message is still being displayed. Please wait.",
        remainingSeconds
      });
    }

    // Calculate the new message's cooldown.
    const newCooldown = calculateCooldown(
      cleanName,
      cleanMessage
    );

    // Store the new message.
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
      cooldownSeconds: Math.ceil(newCooldown / 1000)
    });

  } catch (error) {
    console.error("Send message error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send your message. Please try again."
    });
  }
}

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const COOLDOWN_SECONDS = 30;

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

    // Check whether the watch is still in its cooldown period.
    const { data: current, error: readError } = await supabase
      .from("watch_message")
      .select("updated_at")
      .eq("id", 1)
      .single();

    if (readError) {
      throw readError;
    }

    const lastUpdated = new Date(current.updated_at).getTime();
    const elapsedSeconds = (Date.now() - lastUpdated) / 1000;
    const remainingSeconds = Math.ceil(
      COOLDOWN_SECONDS - elapsedSeconds
    );

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
        name: name.trim(),
        message: message.trim(),
        updated_at: new Date().toISOString()
      })
      .eq("id", 1);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      success: true,
      message: "Your message has been sent to the watch!",
      cooldownSeconds: COOLDOWN_SECONDS
    });

  } catch (error) {
    console.error("Send message error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send your message. Please try again."
    });
  }
}


async function testSupabaseConnection() {
  console.log("Testing Analog Scout AI dataset...");

  const { data, error } = await supabaseClient
    .from("analysis_dataset")
    .select("site_id, planet, site_name, target_site_id");

  if (error) {
    console.error("Dataset connection failed:", error.message);
    return;
  }

  console.log("Dataset connected successfully!");
  console.log("Total sites:", data.length);
  console.table(data);
}

testSupabaseConnection();

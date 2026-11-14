
async function testSupabaseConnection() {
  console.log("Testing Supabase connection...");

  const { data, error } = await supabaseClient
    .from("sites")
    .select("name, body");

  if (error) {
    console.error("Supabase connection failed:", error.message);
    return;
  }

  console.log("Supabase connected successfully!");
  console.table(data);
}

testSupabaseConnection();

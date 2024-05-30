import * as fs from "fs";

export async function downloadFile(
  url: string,
  filename: string
): Promise<void> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Check if the request was successful
      throw new Error(
        `Error downloading file: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer(); // Get binary data
    fs.writeFileSync(filename, Buffer.from(arrayBuffer)); // Write to file

    console.log(`File downloaded successfully: ${filename}`);
  } catch (error) {
    console.error("Download error:", error);
  }
}

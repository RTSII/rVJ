
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { MediaClip } from '@/types';

type ExportProps = {
  timelineClips: MediaClip[];
  audioFile: File;
  setExportProgress: (progress: number) => void;
  ffmpeg: FFmpeg;
};

export async function exportVideo({
  timelineClips,
  audioFile,
  setExportProgress,
  ffmpeg
}: ExportProps): Promise<Blob> {
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  
  let totalFFmpegDuration = 0;
  
  ffmpeg.on('progress', ({ progress, time }) => {
    // We calculate progress based on the total duration of all clips.
    const currentProgress = Math.min(1, time / totalFFmpegDuration);
    setExportProgress(Math.round(currentProgress * 100));
  });

  if (!ffmpeg.loaded) {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  }

  // --- Step 1: Write all necessary source files to FFmpeg's virtual filesystem ---
  await ffmpeg.writeFile(audioFile.name, await fetchFile(audioFile));
  
  const uniqueClipFiles = new Map<string, File>();
  for (const clip of timelineClips) {
    if (!uniqueClipFiles.has(clip.file.name)) {
      uniqueClipFiles.set(clip.file.name, clip.file);
    }
  }

  for (const [name, file] of uniqueClipFiles.entries()) {
    await ffmpeg.writeFile(name, await fetchFile(file));
  }

  // --- Step 2: Trim each video clip according to its start/end times ---
  const trimmedClipNames: string[] = [];
  const trimProgressPortion = 0.8; // Assume trimming takes 80% of the time
  let accumulatedProgress = 0;

  totalFFmpegDuration = timelineClips.reduce((acc, clip) => {
    const duration = (clip.endTime ?? clip.originalDuration ?? 0) - (clip.startTime ?? 0);
    return acc + duration;
  }, 0);

  for (let i = 0; i < timelineClips.length; i++) {
    const clip = timelineClips[i];
    const outputFileName = `trimmed_${i}.mp4`;
    
    const startTime = clip.startTime ?? 0;
    const endTime = clip.endTime ?? clip.originalDuration ?? 0;
    const duration = endTime - startTime;

    // To prevent errors, ensure duration is positive
    if (duration <= 0) continue;

    // Using -t (duration) is often more reliable with -ss than -to (end time)
    await ffmpeg.exec([
        '-i', clip.file.name,
        '-ss', String(startTime),
        '-t', String(duration),
        '-c', 'copy',
        outputFileName
    ]);
    trimmedClipNames.push(outputFileName);
  }

  // --- Step 3: Create a concat file and concatenate all trimmed clips ---
  const concatFileContent = trimmedClipNames.map(name => `file '${name.replace(/'/g, "'\\''")}'`).join('\n');
  await ffmpeg.writeFile('concat.txt', concatFileContent);

  // Set total duration for concatenation progress (rough estimate)
  totalFFmpegDuration += totalFFmpegDuration; // Double it for concat stage

  await ffmpeg.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'concat.txt',
    '-i', audioFile.name,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-shortest',
    'output.mp4',
  ]);
  
  setExportProgress(100);

  const data = await ffmpeg.readFile('output.mp4');
  return new Blob([data], { type: 'video/mp4' });
}

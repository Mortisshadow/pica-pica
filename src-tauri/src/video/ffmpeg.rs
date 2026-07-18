use serde_json::Value;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, ExitStatus, Stdio};
use std::time::{Duration, Instant};

const TOOL_CHECK_TIMEOUT: Duration = Duration::from_secs(3);
const PROBE_TIMEOUT: Duration = Duration::from_secs(15);
const THUMBNAIL_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Debug, Default)]
pub struct VideoInfo {
    pub duration_seconds: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub codec: Option<String>,
}

#[derive(Debug, Clone)]
pub struct FfmpegTools {
    pub available: bool,
    pub source: String,
    ffmpeg_path: PathBuf,
    ffprobe_path: PathBuf,
}

impl FfmpegTools {
    #[cfg(test)]
    pub fn unavailable() -> Self {
        Self {
            available: false,
            source: "missing".to_owned(),
            ffmpeg_path: PathBuf::from(executable_name("ffmpeg")),
            ffprobe_path: PathBuf::from(executable_name("ffprobe")),
        }
    }

    pub fn detect(resource_dir: Option<&Path>) -> Self {
        if let Some(resource_dir) = resource_dir {
            for directory in [resource_dir.join("bin"), resource_dir.join("binaries")] {
                let ffmpeg = directory.join(executable_name("ffmpeg"));
                let ffprobe = directory.join(executable_name("ffprobe"));
                if tool_works(&ffmpeg) && tool_works(&ffprobe) {
                    return Self {
                        available: true,
                        source: "bundled".to_owned(),
                        ffmpeg_path: ffmpeg,
                        ffprobe_path: ffprobe,
                    };
                }
            }
        }

        let ffmpeg = PathBuf::from(executable_name("ffmpeg"));
        let ffprobe = PathBuf::from(executable_name("ffprobe"));
        let available = tool_works(&ffmpeg) && tool_works(&ffprobe);
        Self {
            available,
            source: if available { "system" } else { "missing" }.to_owned(),
            ffmpeg_path: ffmpeg,
            ffprobe_path: ffprobe,
        }
    }

    pub fn probe(&self, path: &Path) -> VideoInfo {
        if !self.available {
            return VideoInfo::default();
        }
        let child = Command::new(&self.ffprobe_path)
            .args([
                "-v",
                "error",
                "-print_format",
                "json",
                "-show_entries",
                "format=duration:stream=codec_type,codec_name,width,height",
            ])
            .arg(path)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn();
        let Ok(child) = child else {
            return VideoInfo::default();
        };
        let Some((status, stdout)) = wait_for_child(child, PROBE_TIMEOUT) else {
            return VideoInfo::default();
        };
        if !status.success() {
            return VideoInfo::default();
        }
        let Ok(value) = serde_json::from_slice::<Value>(&stdout) else {
            return VideoInfo::default();
        };
        let video = value["streams"].as_array().and_then(|streams| {
            streams
                .iter()
                .find(|stream| stream["codec_type"] == "video")
        });
        VideoInfo {
            duration_seconds: value["format"]["duration"]
                .as_str()
                .and_then(|value| value.parse().ok()),
            width: video
                .and_then(|stream| stream["width"].as_u64())
                .map(|value| value as u32),
            height: video
                .and_then(|stream| stream["height"].as_u64())
                .map(|value| value as u32),
            codec: video
                .and_then(|stream| stream["codec_name"].as_str())
                .map(str::to_owned),
        }
    }

    pub fn thumbnail(&self, input: &Path, output: PathBuf) -> bool {
        if !self.available || output.exists() {
            return false;
        }
        let Some(parent) = output.parent() else {
            return false;
        };
        if std::fs::create_dir_all(parent).is_err() {
            return false;
        }
        let child = Command::new(&self.ffmpeg_path)
            .args(["-loglevel", "error", "-ss", "00:00:01", "-i"])
            .arg(input)
            .args([
                "-frames:v",
                "1",
                "-vf",
                "scale=640:-2:force_original_aspect_ratio=decrease",
                "-q:v",
                "3",
                "-y",
            ])
            .arg(&output)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();
        child
            .ok()
            .and_then(|child| wait_for_child(child, THUMBNAIL_TIMEOUT))
            .is_some_and(|(status, _)| status.success())
    }
}

fn tool_works(path: &Path) -> bool {
    Command::new(path)
        .arg("-version")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .ok()
        .and_then(|child| wait_for_child(child, TOOL_CHECK_TIMEOUT))
        .is_some_and(|(status, _)| status.success())
}

fn wait_for_child(mut child: Child, timeout: Duration) -> Option<(ExitStatus, Vec<u8>)> {
    let started = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if started.elapsed() < timeout => {
                std::thread::sleep(Duration::from_millis(25));
            }
            Ok(None) | Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                return None;
            }
        }
    };
    let mut stdout = Vec::new();
    if let Some(mut pipe) = child.stdout.take()
        && pipe.read_to_end(&mut stdout).is_err()
    {
        return None;
    }
    Some((status, stdout))
}

fn executable_name(base: &str) -> String {
    if cfg!(windows) {
        format!("{base}.exe")
    } else {
        base.to_owned()
    }
}

use std::sync::Mutex;
use tauri::{Manager, State};

struct OpencodeState {
    pid: Mutex<Option<u32>>,
}

impl OpencodeState {
    fn kill_process(&self) {
        let pid = {
            let mut pid_lock = self.pid.lock().unwrap_or_else(|e| e.into_inner());
            pid_lock.take()
        };

        if let Some(pid) = pid {
            #[cfg(unix)]
            {
                unsafe {
                    libc::kill(pid as i32, libc::SIGTERM);
                    std::thread::sleep(std::time::Duration::from_millis(300));
                    libc::kill(pid as i32, libc::SIGKILL);
                }
            }
            #[cfg(not(unix))]
            {
                let _ = std::process::Command::new("taskkill")
                    .args(["/F", "/PID", &pid.to_string()])
                    .output();
            }
        }
    }
}

#[tauri::command]
fn start_opencode(state: State<'_, OpencodeState>, port: u16) -> Result<String, String> {
    // Check if already running
    {
        let pid_lock = state.pid.lock().map_err(|e| e.to_string())?;
        if let Some(pid) = *pid_lock {
            #[cfg(unix)]
            {
                unsafe {
                    if libc::kill(pid as i32, 0) == 0 {
                        return Ok(format!("OpenCode server already running (PID: {})", pid));
                    }
                }
            }
            #[cfg(not(unix))]
            {
                return Ok(format!("OpenCode server already running (PID: {})", pid));
            }
        }
    }

    // Spawn opencode serve
    let mut cmd = std::process::Command::new("opencode");
    cmd.arg("serve")
        .arg("--port")
        .arg(port.to_string())
        .arg("--hostname")
        .arg("127.0.0.1");

    // Detach from parent process
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0);
    }

    let child = cmd.spawn().map_err(|e| format!("Failed to start OpenCode: {}", e))?;
    let pid = child.id();

    {
        let mut pid_lock = state.pid.lock().map_err(|e| e.to_string())?;
        *pid_lock = Some(pid);
    }

    // Detach so it survives parent exit
    drop(child);

    Ok(format!("OpenCode server started (PID: {})", pid))
}

#[tauri::command]
fn stop_opencode(state: State<'_, OpencodeState>) -> Result<String, String> {
    let pid = {
        let mut pid_lock = state.pid.lock().map_err(|e| e.to_string())?;
        pid_lock.take()
    };

    match pid {
        Some(pid) => {
            #[cfg(unix)]
            {
                unsafe {
                    libc::kill(pid as i32, libc::SIGTERM);
                    std::thread::sleep(std::time::Duration::from_millis(300));
                    libc::kill(pid as i32, libc::SIGKILL);
                }
            }
            #[cfg(not(unix))]
            {
                let _ = std::process::Command::new("taskkill")
                    .args(["/F", "/PID", &pid.to_string()])
                    .output();
            }
            Ok(format!("OpenCode server stopped (was PID: {})", pid))
        }
        None => Ok("No OpenCode server running".to_string()),
    }
}

#[tauri::command]
fn is_opencode_running(state: State<'_, OpencodeState>) -> bool {
    let pid_lock = state.pid.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(pid) = *pid_lock {
        #[cfg(unix)]
        {
            unsafe { libc::kill(pid as i32, 0) == 0 }
        }
        #[cfg(not(unix))]
        {
            true
        }
    } else {
        false
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = OpencodeState {
        pid: Mutex::new(None),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            start_opencode,
            stop_opencode,
            is_opencode_running,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // App is closing — kill OpenCode server
                let state = window.state::<OpencodeState>();
                state.kill_process();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

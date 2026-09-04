function process_doctor_upload(filePath, outputFolder, frameStep, windowSeconds)
% PROCESS_DOCTOR_UPLOAD
%   Single entry point for a doctor's upload. Detects whether the file
%   is an IMAGE or a VIDEO by extension and routes it through the
%   matching quality-gate + enhancement pipeline. No dataset or labels
%   required - both paths self-contain their own quality scoring.
%
%   USAGE:
%       process_doctor_upload('upload1.jpg', 'doctor_output')
%       process_doctor_upload('exam1.mp4',   'doctor_output')
%       process_doctor_upload('exam1.mp4',   'doctor_output', 5, 1)
%
%   INPUTS:
%       filePath      - path to the uploaded image or video
%       outputFolder  - where results go
%       frameStep, windowSeconds - video-only settings (see
%                       process_video_for_prediction.m); ignored for images
%
%   Requires all the core function files + runAPTOSInferenceBackend.m +
%   process_video_for_prediction.m + create_quality_review_montage.m on the MATLAB path.

    if nargin < 3, frameStep = []; end
    if nargin < 4, windowSeconds = []; end

    imageExts = {'.jpg', '.jpeg', '.png', '.tif', '.tiff', '.bmp'};
    videoExts = {'.mp4', '.avi', '.mov', '.mkv', '.m4v'};

    [~, ~, ext] = fileparts(filePath);
    ext = lower(ext);

    if any(strcmp(ext, imageExts))
        fprintf('Detected IMAGE upload: %s\n', filePath);
        runAPTOSInferenceBackend(filePath, outputFolder);
    elseif any(strcmp(ext, videoExts))
        fprintf('Detected VIDEO upload: %s\n', filePath);
        process_video_for_prediction(filePath, outputFolder, frameStep, windowSeconds);
    else
        error(['Unrecognized file type "%s".\nSupported images: %s\n' ...
            'Supported videos: %s'], ext, strjoin(imageExts, ', '), strjoin(videoExts, ', '));
    end
end

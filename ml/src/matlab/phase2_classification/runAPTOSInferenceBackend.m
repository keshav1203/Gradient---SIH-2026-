function resultFile = runAPTOSInferenceBackend(imageFile, reportFolder)
%% runAPTOSInferenceBackend.m
% Headless / Backend-ready inference function for APTOS 2019 DR Classification
%
% Inputs:
%   imageFile    - Full path to input fundus image
%   reportFolder - (Optional) Destination path for heatmaps, overlays, and JSON
%
% Output:
%   resultFile   - Full path to the generated output JSON file

if nargin < 2 || isempty(reportFolder)
    scriptFolder = fileparts(mfilename('fullpath'));
    projectRoot = fileparts(fileparts(fileparts(fileparts(scriptFolder))));
    reportFolder = fullfile(projectRoot, 'reports', 'generated', 'aptos', 'aptos5class', 'inference');
end

if ~isfolder(reportFolder)
    mkdir(reportFolder);
end

scriptFolder = fileparts(mfilename('fullpath'));
projectRoot = fileparts(fileparts(fileparts(fileparts(scriptFolder))));

modelFile = fullfile(projectRoot, 'ml', 'models', 'checkpoints', 'aptos5class', 'retinalResNet18_APTOS_5CLASS.mat');

if ~isfile(modelFile)
    error('APTOS 5-class model checkpoint not found: %s', modelFile);
end

modelData = load(modelFile);

if isfield(modelData,'netAPTOS5')
    net = modelData.netAPTOS5;
elseif isfield(modelData,'netAPTOS')
    net = modelData.netAPTOS;
elseif isfield(modelData,'net')
    net = modelData.net;
else
    error('No compatible network variable found in model file.');
end

classNumbers = [0 1 2 3 4];
classNames = {'No_DR', 'Mild', 'Moderate', 'Severe', 'Proliferative_DR'};

if ~isfile(imageFile)
    error('Input image file not found: %s', imageFile);
end

[~, fileNameOnly, ext] = fileparts(imageFile);
fileName = [fileNameOnly ext];

I = imread(imageFile);

inputSize = net.Layers(1).InputSize;
Iinput = imresize(I, inputSize(1:2));

if size(Iinput, 3) == 1
    Iinput = repmat(Iinput, 1, 1, 3);
elseif size(Iinput, 3) > 3
    Iinput = Iinput(:,:,1:3);
end

[predictedLabel, scores] = classify(net, Iinput);
confidence = double(max(scores));
predictedClassName = string(predictedLabel);

predictedIndex = find(strcmp(classNames, char(predictedClassName)), 1);
if isempty(predictedIndex)
    error('Predicted class does not match expected classes.');
end
predictedClassNumber = classNumbers(predictedIndex);

probabilities = struct();
for i = 1:numel(classNames)
    probability = double(scores(i));
    fieldName = matlab.lang.makeValidName(classNames{i});
    probabilities.(fieldName) = probability;
end

% Grad-CAM
lgraph = layerGraph(net);
convLayerNames = {};
for i = 1:numel(lgraph.Layers)
    currentLayer = lgraph.Layers(i);
    if isa(currentLayer, 'nnet.cnn.layer.Convolution2DLayer')
        convLayerNames{end+1} = currentLayer.Name; %#ok<AGROW>
    end
end

if ~isempty(convLayerNames)
    targetLayer = convLayerNames{end};
else
    targetLayer = 'res5b_branch2b';
end

try
    scoreMap = gradCAM(net, Iinput, predictedLabel, 'ReductionLayer', targetLayer);
catch
    try
        scoreMap = gradCAM(net, Iinput, predictedLabel);
    catch
        scoreMap = zeros(inputSize(1:2));
    end
end

scoreMap = double(scoreMap);
scoreMap = scoreMap - min(scoreMap(:));
maxScore = max(scoreMap(:));
if maxScore > 0
    scoreMap = scoreMap ./ maxScore;
end

heatmap = imresize(scoreMap, [size(I,1), size(I,2)]);

heatmapFile = fullfile(reportFolder, [fileNameOnly '_heatmap.png']);
imwrite(uint8(255 * heatmap), heatmapFile);

fig = figure('Visible', 'off');
imshow(I);
hold on;
imagesc(heatmap);
axis image off;
colormap jet;
colorbar;
alpha(0.45);
title(sprintf('Grad-CAM: %s (%.2f%%)', char(predictedClassName), confidence * 100), 'Interpreter', 'none');

gradcamFile = fullfile(reportFolder, [fileNameOnly '_gradcam.png']);
exportgraphics(fig, gradcamFile);
close(fig);

result = struct();
result.status = 'success';
result.dataset = 'APTOS 2019';
result.model = 'ResNet-18';
result.task = '5-Class Diabetic Retinopathy Classification';

result.image = struct();
result.image.filename = fileName;
result.image.original_path = imageFile;

result.prediction = struct();
result.prediction.class_id = predictedClassNumber;
result.prediction.class_name = char(predictedClassName);
result.prediction.confidence = confidence;
result.prediction.confidence_percent = confidence * 100;
result.prediction.class_probabilities = probabilities;

result.explainability = struct();
result.explainability.method = 'Grad-CAM';
result.explainability.target_class = char(predictedClassName);
result.explainability.target_layer = targetLayer;
result.explainability.heatmap = heatmapFile;
result.explainability.overlay = gradcamFile;

result.generated_at = char(datetime('now', 'Format', 'yyyy-MM-dd HH:mm:ss'));

resultFile = fullfile(reportFolder, [fileNameOnly '_result.json']);
jsonText = jsonencode(result, 'PrettyPrint', true);

fid = fopen(resultFile, 'w');
if fid == -1
    error('Could not create JSON file: %s', resultFile);
end
fprintf(fid, '%s', jsonText);
fclose(fid);

end

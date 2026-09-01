%% evaluateAPTOSResNet18.m
% APTOS ResNet-18 Evaluation
%
% Outputs:
%   - Confusion Matrix
%   - Accuracy
%   - Sensitivity
%   - Specificity
%   - Precision
%   - F1-score
%
% Saves:
%   1. MATLAB .mat result
%   2. Backend-ready .json result

clear;
clc;
close all;

%% ============================================================
% PROJECT ROOT
% =============================================================

scriptFolder = fileparts(mfilename('fullpath'));

projectRoot = fileparts( ...
    fileparts( ...
    fileparts( ...
    fileparts(scriptFolder))));

fprintf('\nProject root:\n%s\n', projectRoot);

%% ============================================================
% PATHS
% =============================================================

datasetRoot = fullfile( ...
    projectRoot, ...
    'aptos_dataset');

processedFolder = fullfile( ...
    datasetRoot, ...
    'processed');

enhancedFolder = fullfile( ...
    processedFolder, ...
    'enhanced_images');

testCSV = fullfile( ...
    processedFolder, ...
    'test_labels.csv');

modelFile = fullfile( ...
    projectRoot, ...
    'ml', ...
    'models', ...
    'checkpoints', ...
    'retinalResNet18_APTOS.mat');

reportFolder = fullfile( ...
    projectRoot, ...
    'reports', ...
    'generated', ...
    'aptos');

if ~isfolder(reportFolder)
    mkdir(reportFolder);
end

%% ============================================================
% LOAD MODEL
% =============================================================

fprintf('\n========================================\n');
fprintf('LOADING APTOS RESNET-18\n');
fprintf('========================================\n');

data = load(modelFile);

netAPTOS = data.netAPTOS;

fprintf('Model loaded successfully.\n');

%% ============================================================
% LOAD TEST LABELS
% =============================================================

fprintf('\nLoading test labels...\n');

testTable = readtable(testCSV);

testIDs = string(testTable.id_code);

testLabels = categorical( ...
    string(testTable.binary_label));

fprintf('Test images: %d\n', height(testTable));

%% ============================================================
% CREATE TEST FILE LIST
% ============================================================

testFiles = fullfile( ...
    enhancedFolder, ...
    testIDs + ".png");

if any(~isfile(testFiles))

    error('Some test images are missing.');

end

%% ============================================================
% CREATE TEST DATASTORE
% =============================================================

imdsTest = imageDatastore( ...
    testFiles, ...
    'Labels', ...
    testLabels);

%% ============================================================
% RESNET INPUT SIZE
% =============================================================

inputSize = netAPTOS.Layers(1).InputSize;

augimdsTest = augmentedImageDatastore( ...
    inputSize(1:2), ...
    imdsTest, ...
    'ColorPreprocessing','gray2rgb');

%% ============================================================
% PREDICTION
% =============================================================

fprintf('\n========================================\n');
fprintf('RUNNING TEST PREDICTION\n');
fprintf('========================================\n');

[predictedLabels,scores] = classify( ...
    netAPTOS, ...
    augimdsTest);

%% ============================================================
% CLASS NAMES
% =============================================================

classNames = categories(testLabels);

nonRefIndex = find( ...
    strcmp(classNames,'Non_Referable'));

refIndex = find( ...
    strcmp(classNames,'Referable'));

%% ============================================================
% CONFUSION MATRIX
% =============================================================

C = confusionmat( ...
    testLabels, ...
    predictedLabels, ...
    'Order',categorical(classNames));

%% ============================================================
% CONFUSION MATRIX VALUES
% ============================================================

% Rows    = Actual
% Columns = Predicted

TN = C(nonRefIndex,nonRefIndex);

FP = C(nonRefIndex,refIndex);

FN = C(refIndex,nonRefIndex);

TP = C(refIndex,refIndex);

%% ============================================================
% METRICS
% ============================================================

accuracy = ...
    (TP + TN) / sum(C(:));

sensitivity = ...
    safeDivide(TP,TP + FN);

specificity = ...
    safeDivide(TN,TN + FP);

precision = ...
    safeDivide(TP,TP + FP);

F1 = ...
    safeDivide( ...
        2 * precision * sensitivity, ...
        precision + sensitivity);

%% ============================================================
% DISPLAY CONFUSION MATRIX
% ============================================================

fprintf('\n========================================\n');
fprintf('CONFUSION MATRIX\n');
fprintf('========================================\n');

disp(array2table( ...
    C, ...
    'VariableNames', ...
    matlab.lang.makeValidName(cellstr(classNames)), ...
    'RowNames', ...
    cellstr(classNames)));

%% ============================================================
% DISPLAY METRICS
% ============================================================

fprintf('\n========================================\n');
fprintf('APTOS RESNET-18 TEST RESULTS\n');
fprintf('========================================\n');

fprintf('True Positive  (TP): %d\n',TP);
fprintf('True Negative  (TN): %d\n',TN);
fprintf('False Positive (FP): %d\n',FP);
fprintf('False Negative (FN): %d\n',FN);

fprintf('\nAccuracy    : %.2f%%\n',accuracy * 100);
fprintf('Sensitivity : %.2f%%\n',sensitivity * 100);
fprintf('Specificity : %.2f%%\n',specificity * 100);
fprintf('Precision   : %.2f%%\n',precision * 100);
fprintf('F1-score    : %.2f%%\n',F1 * 100);

%% ============================================================
% CONFUSION MATRIX FIGURE
% ============================================================

figure( ...
    'Name','APTOS ResNet-18 Confusion Matrix', ...
    'NumberTitle','off');

cm = confusionchart( ...
    testLabels, ...
    predictedLabels);

cm.Title = ...
    'APTOS ResNet-18 - Test Confusion Matrix';

cm.RowSummary = 'row-normalized';
cm.ColumnSummary = 'column-normalized';

%% ============================================================
% MATLAB RESULTS
% ============================================================

results = struct();

results.dataset = 'APTOS 2019';
results.model = 'ResNet-18';
results.task = 'Binary Diabetic Retinopathy Classification';

results.classes = classNames;

results.test_images = height(testTable);

results.confusion_matrix = C;

results.TP = TP;
results.TN = TN;
results.FP = FP;
results.FN = FN;

results.accuracy = accuracy;
results.sensitivity = sensitivity;
results.specificity = specificity;
results.precision = precision;
results.F1_score = F1;

results.accuracy_percent = accuracy * 100;
results.sensitivity_percent = sensitivity * 100;
results.specificity_percent = specificity * 100;
results.precision_percent = precision * 100;
results.F1_score_percent = F1 * 100;

%% ============================================================
% SAVE MAT
% =============================================================

matFile = fullfile( ...
    reportFolder, ...
    'aptos_resnet18_evaluation.mat');

save( ...
    matFile, ...
    'results');

%% ============================================================
% BACKEND JSON
% ============================================================

jsonResults = struct();

jsonResults.dataset = 'APTOS 2019';
jsonResults.model = 'ResNet-18';
jsonResults.task = ...
    'Binary Diabetic Retinopathy Classification';

jsonResults.test_images = height(testTable);

%% Prediction labels

jsonResults.prediction = struct();

jsonResults.prediction.positive_class = ...
    'Referable';

jsonResults.prediction.negative_class = ...
    'Non_Referable';

%% Confusion matrix

jsonResults.confusion_matrix = struct();

jsonResults.confusion_matrix.true_positive = TP;
jsonResults.confusion_matrix.true_negative = TN;
jsonResults.confusion_matrix.false_positive = FP;
jsonResults.confusion_matrix.false_negative = FN;

%% Metrics

jsonResults.metrics = struct();

jsonResults.metrics.accuracy = accuracy;
jsonResults.metrics.sensitivity = sensitivity;
jsonResults.metrics.specificity = specificity;
jsonResults.metrics.precision = precision;
jsonResults.metrics.f1_score = F1;

%% Percentage metrics

jsonResults.metrics_percent = struct();

jsonResults.metrics_percent.accuracy = ...
    accuracy * 100;

jsonResults.metrics_percent.sensitivity = ...
    sensitivity * 100;

jsonResults.metrics_percent.specificity = ...
    specificity * 100;

jsonResults.metrics_percent.precision = ...
    precision * 100;

jsonResults.metrics_percent.f1_score = ...
    F1 * 100;

%% Timestamp

jsonResults.generated_at = ...
    char(datetime( ...
    'now', ...
    'Format','yyyy-MM-dd HH:mm:ss'));

%% ============================================================
% WRITE JSON
% =============================================================

jsonFile = fullfile( ...
    reportFolder, ...
    'aptos_resnet18_evaluation.json');

jsonText = jsonencode( ...
    jsonResults, ...
    'PrettyPrint',true);

fid = fopen(jsonFile,'w');

if fid == -1
    error('Could not create JSON file.');
end

fprintf(fid,'%s',jsonText);

fclose(fid);

%% ============================================================
% FINAL OUTPUT
% =============================================================

fprintf('\n========================================\n');
fprintf('EVALUATION COMPLETED\n');
fprintf('========================================\n');

fprintf('\nJSON output:\n');
fprintf('%s\n',jsonFile);

fprintf('\nMAT output:\n');
fprintf('%s\n',matFile);

fprintf('\n========================================\n');
fprintf('BACKEND METRICS\n');
fprintf('========================================\n');

fprintf('Accuracy    : %.2f%%\n', ...
    accuracy * 100);

fprintf('Sensitivity : %.2f%%\n', ...
    sensitivity * 100);

fprintf('Specificity : %.2f%%\n', ...
    specificity * 100);

fprintf('Precision   : %.2f%%\n', ...
    precision * 100);

fprintf('F1-score    : %.2f%%\n', ...
    F1 * 100);


%% ============================================================
% SAFE DIVISION
% ============================================================

function result = safeDivide(numerator,denominator)

    if denominator == 0
        result = 0;
    else
        result = numerator / denominator;
    end

end
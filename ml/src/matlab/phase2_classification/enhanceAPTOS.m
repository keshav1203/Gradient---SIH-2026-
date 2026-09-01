%% enhanceAPTOS.m
% APTOS enhancement using Phase 1 core functions

clear;
clc;

%% Project root

scriptFolder = fileparts(mfilename('fullpath'));

projectRoot = fileparts( ...
    fileparts( ...
    fileparts( ...
    fileparts(scriptFolder))));

%% Phase 1 core functions

coreFunctions = fullfile( ...
    projectRoot, ...
    'ml', ...
    'src', ...
    'matlab', ...
    'phase1_quality', ...
    'CORE_FUNCTIONS');

addpath(coreFunctions);

%% Paths

imageFolder = fullfile( ...
    projectRoot, ...
    'aptos_dataset', ...
    'raw', ...
    'train_images');

processedFolder = fullfile( ...
    projectRoot, ...
    'aptos_dataset', ...
    'processed');

enhancedFolder = fullfile( ...
    processedFolder, ...
    'enhanced_images');

%% Create output folder

if ~isfolder(enhancedFolder)
    mkdir(enhancedFolder);
end

%% Check functions

assert(exist('getFOVMask','file') == 2, ...
    'getFOVMask.m not found.');

assert(exist('enhanceImage','file') == 2, ...
    'enhanceImage.m not found.');

%% Get APTOS images

files = dir(fullfile(imageFolder,'*.png'));

fprintf('\n========================================\n');
fprintf('APTOS IMAGE ENHANCEMENT\n');
fprintf('========================================\n');

fprintf('Images found: %d\n\n',numel(files));

%% Process images

for i = 1:numel(files)

    inputFile = fullfile( ...
        imageFolder, ...
        files(i).name);

    outputFile = fullfile( ...
        enhancedFolder, ...
        files(i).name);

    %% Read

    I = imread(inputFile);

    %% FOV detection

    mask = getFOVMask(I);

    %% Phase 1 enhancement pipeline

    Ienh = enhanceImage( ...
        I, ...
        mask, ...
        [512 512]);

    %% Save

    imwrite( ...
        Ienh, ...
        outputFile);

    %% Progress

    if mod(i,100) == 0 || i == numel(files)

        fprintf( ...
            'Processed %d / %d\n', ...
            i, ...
            numel(files));

    end

end

fprintf('\n========================================\n');
fprintf('ENHANCEMENT COMPLETED\n');
fprintf('========================================\n');

fprintf('\nEnhanced images saved to:\n');
fprintf('%s\n',enhancedFolder);
%% checkAPTOSenhancement.m

clear;
clc;
close all;

%% Project root

scriptFolder = fileparts(mfilename('fullpath'));

projectRoot = fileparts( ...
    fileparts( ...
    fileparts( ...
    fileparts(scriptFolder))));

%% Folders

rawFolder = fullfile( ...
    projectRoot, ...
    'aptos_dataset', ...
    'raw', ...
    'train_images');

enhancedFolder = fullfile( ...
    projectRoot, ...
    'aptos_dataset', ...
    'processed', ...
    'enhanced_images');

%% Get images

files = dir(fullfile(rawFolder,'*.png'));

%% Select 6 images

rng(42);

idx = randperm(numel(files),min(6,numel(files)));

%% Display

figure('Name','APTOS Raw vs Enhanced');

for i = 1:numel(idx)

    filename = files(idx(i)).name;

    rawImage = imread( ...
        fullfile(rawFolder,filename));

    enhancedImage = imread( ...
        fullfile(enhancedFolder,filename));

    subplot(2,6,i);

    imshow(rawImage);

    title('Raw');

    subplot(2,6,i+6);

    imshow(enhancedImage);

    title('Enhanced');

end

sgtitle('APTOS Enhancement Check');
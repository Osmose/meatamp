#include <stdlib.h>
#include <stdio.h>
#include "SDL.h"
#include "gme.h"

static int sample_rate;
static Music_Emu* emu;
static SDL_AudioSpec want, have;

void meatCallback(void* userdata, Uint8* stream, int len);
void handle_error(const char* str);
static void sound_start();
static void sound_stop();
static void sound_cleanup();

void meatInit(int freq, int samples) {
    // Init SDL
    if (SDL_InitSubSystem(SDL_INIT_AUDIO) == -1) {
        printf("Error: Could not initialize SDL audio subsystem.\n");
        exit(EXIT_FAILURE);
    }

    sample_rate = freq;
    want.freq = sample_rate;
    want.format = AUDIO_S16LSB;
    want.channels = 2;
    want.samples = samples;
    want.callback = meatCallback;  // you wrote this function elsewhere.

    if (SDL_OpenAudio(&want, &have) < 0) {
        printf("Failed to open audio: %s\n", SDL_GetError());
    } else {
        if (have.format != want.format) {
            printf("We didn't get audio format.\n");
        }
    }
}

void meatPlay(char* filename, int track) {
    sound_stop();
    handle_error(gme_open_file(filename, &emu, sample_rate));
    handle_error(gme_start_track(emu, track));
    sound_start();
}

void meatChangeTrack(int track) {
    if (emu) {
        sound_stop();
        gme_start_track(emu, track);
        sound_start();
    }
}

void meatCallback(void* userdata, Uint8* stream, int len) {
    handle_error(gme_play(emu, len / 2, (short*)stream));
}

void meatExit() {
    sound_cleanup();
    SDL_QuitSubSystem(SDL_INIT_AUDIO);
}

static void sound_start()
{
    SDL_PauseAudio(0);
}

static void sound_stop()
{
    SDL_PauseAudio(1);

    // be sure audio thread is not active
    SDL_LockAudio();
    SDL_UnlockAudio();
}

static void sound_cleanup()
{
    sound_stop();
    SDL_CloseAudio();
}

void handle_error(const char* str) {
    if (str) {
        printf("Error: %s\n", str); getchar();
        exit(EXIT_FAILURE);
    }
}

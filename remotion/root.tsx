import {Composition} from 'remotion';
import {AionexDaily,DEFAULT_AIONEX_VIDEO_PROPS} from './AionexDaily';
import {AionexIntro} from './AionexIntro';

export const RemotionRoot = () => {
  return (
    <>
    <Composition
      id="AionexDaily"
      component={AionexDaily}
      durationInFrames={900}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={DEFAULT_AIONEX_VIDEO_PROPS}
    />
    <Composition
      id="AionexIntro"
      component={AionexIntro}
      durationInFrames={90}
      fps={30}
      width={1920}
      height={1080}
    />
    </>
  );
};

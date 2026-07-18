import {Composition} from 'remotion';
import {AionexIntro} from './AionexIntro';

export const RemotionRoot = () => {
  return (
    <Composition
      id="AionexIntro"
      component={AionexIntro}
      durationInFrames={90}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

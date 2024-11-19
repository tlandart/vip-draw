import { useEffect } from "react";
import { useTimer } from "react-timer-hook";

/* The game timer. Uses react-timer-hook. It is an invisible component, but onTimerChange can be used every time the seconds left changes. */

export default function VipCanvas({
  secondsInit,
  setRestartTimerFunc,
  onTimerChange,
}) {
  const expiryTimestamp = new Date();
  expiryTimestamp.setSeconds(expiryTimestamp.getSeconds() + secondsInit);

  const { seconds, restart, pause } = useTimer({
    expiryTimestamp,
    onExpire: () => {},
  });

  useEffect(function () {
    pause();

    // start or restart the timer
    function startTimer() {
      const time = new Date();
      time.setSeconds(time.getSeconds() + secondsInit);
      restart(time, true);
      console.log("started timer");
    }

    setRestartTimerFunc(() => () => {
      startTimer();
    });
  }, []);

  useEffect(
    function () {
      onTimerChange(seconds);
    },
    [seconds]
  );

  return <></>;
}

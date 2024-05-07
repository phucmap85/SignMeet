import { useMicVAD } from "@ricky0123/vad-react/src"

const App = () => {
  const vad = useMicVAD({
    startOnLoad: true,
    onSpeechEnd: (audio) => {
      console.log("User stopped talking")
    },
  })
  return <div>{vad.userSpeaking && "User is speaking"}</div>
}

export default App
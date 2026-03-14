interface Props {
  onRetry: () => void;
}

const DefeatScreen = ({ onRetry }: Props) => {
  return (
    <div className="result-overlay defeat">
      <h2>GAME OVER</h2>
      <p>体力が尽きた…</p>
      <button type="button" onClick={onRetry}>
        リトライ
      </button>
    </div>
  );
};

export default DefeatScreen;

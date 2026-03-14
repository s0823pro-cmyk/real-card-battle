interface Props {
  count: number;
}

const DandoriIndicator = ({ count }: Props) => {
  if (count <= 0) return null;
  return <p className="dandori-indicator">⚡ 段取り成立 {count}</p>;
};

export default DandoriIndicator;

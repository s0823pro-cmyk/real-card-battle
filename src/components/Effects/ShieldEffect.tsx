interface Props {
  active: boolean;
}

const ShieldEffect = ({ active }: Props) => {
  if (!active) return null;
  return <div className="shield-effect" aria-hidden="true" />;
};

export default ShieldEffect;

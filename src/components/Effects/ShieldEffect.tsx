interface Props {
  active: boolean;
}

const ShieldEffect = ({ active }: Props) => {
  if (!active) return null;
  return (
    <div className="shield-effect" aria-hidden="true">
      <div className="shield-effect-dome shield-effect-dome--back" />
      <div className="shield-effect-dome shield-effect-dome--front" />
      <div className="shield-effect-core" />
      <div className="shield-effect-ring" />
      <div className="shield-effect-shards">
        <i className="shield-effect-shard shield-effect-shard--1" />
        <i className="shield-effect-shard shield-effect-shard--2" />
        <i className="shield-effect-shard shield-effect-shard--3" />
        <i className="shield-effect-shard shield-effect-shard--4" />
        <i className="shield-effect-shard shield-effect-shard--5" />
        <i className="shield-effect-shard shield-effect-shard--6" />
      </div>
    </div>
  );
};

export default ShieldEffect;

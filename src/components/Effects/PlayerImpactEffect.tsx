type PlayerImpactKind = 'damage' | 'mental' | 'burn' | 'poison';

interface Props {
  kind: PlayerImpactKind;
}

const SHARDS = Array.from({ length: 7 }, (_, index) => index);

const PlayerImpactEffect = ({ kind }: Props) => {
  return (
    <div className={`player-impact-effect player-impact-effect--${kind}`} aria-hidden="true">
      <div className="player-impact-vignette" />
      <div className="player-impact-core" />
      <div className="player-impact-ring" />
      <div className="player-impact-shards">
        {SHARDS.map((shard) => (
          <i key={shard} className={`player-impact-shard player-impact-shard--${shard + 1}`} />
        ))}
      </div>
    </div>
  );
};

export default PlayerImpactEffect;

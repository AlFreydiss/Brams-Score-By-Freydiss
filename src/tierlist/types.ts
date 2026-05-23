export type TierId = string

export type Tier = {
  id: TierId
  label: string
  color: string
}

export type TierItem = {
  id: string
  name: string
  tierId: TierId | null
}

export type PublishedTierList = {
  id: string
  title: string
  theme: string
  author: string
  visibility: 'public' | 'private'
  published: boolean
  createdAt: string
  likes: number
  tiers: Tier[]
  items: TierItem[]
  image?: string
}

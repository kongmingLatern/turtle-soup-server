import { Soup } from './soup.entity'

export const builtinSoups: Array<Pick<Soup, 'title' | 'surface' | 'answer' | 'category' | 'difficulty'>> = [
  {
    title: '最后一碗海龟汤',
    surface: '男人走进餐厅，点了一碗海龟汤。喝了一口后，他脸色惨白，回家后结束了自己的生命。为什么？',
    answer:
      '他曾在海难中被同伴骗吃“海龟汤”，实际上吃的是遇难者的肉。多年后喝到真正海龟汤，发现味道不同，意识到当年的真相。',
    category: '经典',
    difficulty: 'easy',
  },
  {
    title: '午夜电梯',
    surface: '女孩每天回家都会坐电梯到 12 楼，再走楼梯到 15 楼。下雨天她却会直接坐到 15 楼。为什么？',
    answer: '女孩个子矮，平时按不到 15 楼按钮，只能按到 12 楼。下雨天她带伞，可以用伞尖按到 15 楼。',
    category: '生活',
    difficulty: 'easy',
  },
  {
    title: '不能打开的窗',
    surface: '一个男人被发现死在房间里，地上有水和碎玻璃，窗户紧闭。房间里没有其他人。发生了什么？',
    answer: '死者是一条鱼，鱼缸破了，水和玻璃散落在地，鱼因此死亡。“房间”指鱼缸所在的房间。',
    category: '反转',
    difficulty: 'easy',
  },
  {
    title: '消失的乘客',
    surface: '一辆车发生事故，司机活着，乘客却消失了。警察没有追查乘客失踪。为什么？',
    answer: '那是一辆灵车，乘客是棺材里的遗体。事故后遗体被殡仪人员带走，所以警察没有按失踪处理。',
    category: '悬疑',
    difficulty: 'medium',
  },
  {
    title: '生日礼物',
    surface: '女人收到丈夫送的生日礼物后非常开心。几分钟后，她却报警说丈夫想杀她。为什么？',
    answer:
      '丈夫送的是一副昂贵的潜水装备，并安排她去潜水。但女人发现氧气瓶被动过手脚，若下水会出事故，因此报警。',
    category: '犯罪',
    difficulty: 'medium',
  },
  {
    title: '没有伤口的死亡',
    surface: '一名登山者死在雪地里，身上没有明显伤口，旁边只有一根断掉的绳子和一块手表。为什么？',
    answer:
      '两名登山者被困，绳子承重不足。他们约定看表轮流割绳牺牲一人，但其中一人的手表慢了，导致判断错误，最终坠落或冻死。',
    category: '心理',
    difficulty: 'hard',
  },
  {
    title: '黑暗中的掌声',
    surface: '剧院停电后，全场观众鼓掌。灯亮后，一名演员倒在舞台上。为什么？',
    answer:
      '这是魔术或舞台剧的一环，停电时观众以为是表演效果而鼓掌；实际有人趁黑暗制造事故，演员倒下。',
    category: '舞台',
    difficulty: 'medium',
  },
  {
    title: '永远迟到的人',
    surface: '男人每天都迟到，老板却从不责怪他。某天他准时到达，老板立刻辞退了他。为什么？',
    answer:
      '他是守夜人或安全岗，正常应在夜间巡逻，白天“迟到”代表夜班结束后才出现；准时到白班说明他昨晚没有在岗。',
    category: '职业',
    difficulty: 'medium',
  },
]

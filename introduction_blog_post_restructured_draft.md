# Why did I lose this AoE4 game?

People post AoE4World links all the time with some version of the same question: "How did I lose this game?"

I'm building a tool to answer that with data. It takes an AoE4World match URL and reconstructs how both players gathered, spent, floated, lost, and converted resources over time. It is not a replacement for watching the replay. I still think replay review is the best way to understand the messy stuff. The point is to make the shape of the game easier to see before you go hunting through the VOD.

The basic premise is simple:

Age of Empires IV is a game about gathering resources and turning them into useful things.

RTS players already talk about economy, tech, and military investment. You can put resources into workers, farms, production, upgrades, age-ups, units, walls, towers, keeps, whatever. The hard part is seeing when those choices start paying off, how long they take to matter, and whether they turn into an advantage before the game ends.

The tool tries to show that process directly. If someone asks, "Why did I win or lose?", they should be able to paste in a match URL and see where the game state split: who spent on economy, who built army, who floated resources, who lost value in fights, and when those differences started to bite.

Ideally, the next Reddit thread about a confusing loss can have a concrete answer: "Here's what the game looked like."

## What the report shows

Start with the bands at the top: economy, technology, and military deployed resources.

By "net deployed resources," I mean the value currently committed to a category, minus the value the opponent has destroyed. It is a model of the game state, not perfect replay truth. But it gives you a decent way to compare how each player was converting resources over time.

The main categories are:

- Economic: villagers, farms, and other investments that support resource generation or keep the economy running.
- Technology: research and age-up investment.
- Military: active military value.

The report also tracks a few supporting categories:

- Destroyed: value destroyed by the opponent.
- Overall: economic + technology + military + other deployed value.
- Float: resources gathered but not spent.
- Opportunity lost: resources that could have been generated, but were not because of villager losses or villager under-production.

The charts include event markers for big raids and fights. These show what each army looked like before the encounter and what changed afterward. That matters because a lot of games are not lost in one clean "aha" moment. They drift through a sequence of investments, missed conversions, fights, and recoveries.

## What the tool still misses

This is still a model. Useful, but definitely not omniscient.
* It does not know exact map position, so it cannot always tell whether a fight happened under defensive fire, in a choke, near a keep, or in some other important spot.
* It does not understand micro, target firing, pathing, formation quality, or moment-to-moment control.
* It also does not fully model idle villagers or idle production yet, even when a replay makes those visible.

Some civilizations need special handling. Delhi is the clearest example right now. I have not figured out how to make Delhi's technology research fit the model cleanly. There are probably other edge cases I have not hit yet.

The tool works best today on typical 10- to 30-minute 1v1 games where investments, fights, float, and losses create a visible gap in game state.

It is better on desktop too. I made an effort to support mobile, but this is a dense report, and the desktop version is still much easier to use.

## A real example

For an example, I am using a recent Beasty vs Core game that Beasty lost: [AoE4World match](https://aoe4world.com/players/8139502-Beasty/games/229727104?sig=b6fc4eab80fa84ff983bcb27b4af086a59a09f5d).

The game is also on YouTube, which helps because you can watch the replay alongside the data: [YouTube video](https://youtu.be/1WXwG3PiVCA?si=8SiSz48REitV5Htt&t=2580)

When you open the report, the first thing to check is the three bands across the top: economy, technology, and military. They are a simplified view of the charts below. At each point in the game, they show which player has more net deployed value in each category.

The first pattern is pretty normal for Sengoku. Beasty's Sengoku ages later and spends more on dark-age economy. For most of the game, Sengoku has more net economic deployed resources, with a brief exception around 8 minutes.

Core's Macedonian has more military deployed for most of the game, except for a short stretch around 8 to 10 minutes.

So the basic tension is clear early: Beasty is carrying more economic investment, while Core is carrying more military pressure.

## The first major fight

The event widgets mark six important engagements in this game.

The first is at 8:15. In the video, Core dives with seven units while Beasty ages up and gets almost nothing for it.

The data shows one Yatai destroyed during that window, but not much else. Beasty does not take meaningful direct damage. In the model, this is a bad trade for Core: he loses almost 25% of his deployed resource value and causes almost no damage.

If you watch the VOD, though, you can see something the tool does not fully capture: Sengoku has a lot of idle time during this moment. That matters. It is one of the reasons I do not want to oversell the model as replay truth.

## The reverse at 12:18

The next fight, at 12:18, goes the other way.

Before the encounter, Macedonian has six Riddari and three Crossbows. Sengoku has four Mounted Samurai and three Ikko-ikki monks. The monks count as military here because they deal damage, though in practice they are usually there to keep the army alive through healing.

This time, Sengoku takes the real hit. Sengoku loses almost 10% of deployed resources, while Macedonian loses only a scout.

The surrounding allocations give the fight some context. Sengoku has roughly a 300 to 400 resource lead in economic investment, while Macedonian has roughly a 300 resource lead in military investment.

The opportunity lost section adds another small detail. Macedonian lost a villager around 10 minutes, which is about 90 resources of lost generation by 12 minutes. But Sengoku has also lost value through villager under-production: 260 resources compared with 197 for Macedonian. In this game, that is not the main story. In other games, it can matter a lot. By 23 minutes, that one lost villager would have gathered about 600 resources.

## Small wins before the split

After that, Sengoku gets two smaller positive trades despite having less active military value. The tooltip says:

> That usually means the fight had an extenuating factor: defensive-structure fire, an isolated engagement where Sengoku Daimyo found an advantage, healing, stronger micro, or a favorable unit matchup.

I like this part of the report because it catches the mismatch between army value and fight result. "More army value" does not automatically mean "wins every fight." When the data points one way and the result goes another, that is usually where the replay has something worth watching.

## Where the game splits

The most interesting stretch starts after the fight at 19:51.

At that point, the players are close in several ways. Their economic net investment is almost identical. Their military investment is almost identical. Macedonian is ahead in technology, but from a resource deployment view the game still looks competitive.

Then the lines separate.

By the next major fight, around 23 minutes, Sengoku has almost 3,000 more invested in economy. Macedonian has almost 5,000 more invested in military and around 3,000 more invested in technology.

That is the game. Sengoku has put much more into sustaining and expanding the economy, including farm infrastructure. Macedonian has turned more resources into immediate fighting power and tech. When the final fights happen, the Macedonian army advantage is large enough that Sengoku's economic investment does not have time to pay off.

The report also shows Sengoku floating a lot before the final fights, especially gold and stone. Float is gathered potential that has not become useful yet. Against an opponent who has already turned resources into army and technology, that can kill you.

One modeling detail I like: the tool separates resource generation from resource infrastructure. Farms show up as infrastructure, not generation, because a farm does not immediately increase gather rate. It keeps the economy running. That distinction matters because two "economic" investments can have very different timing.

## Why I built this

I built this because I play a lot of AoE4, and I find it really interesting and compelling when a complex situation can be described with data in such a way that it increases people's understanding of that situation.

I also want to credit AoE4World properly. This tool depends heavily on the AoE4World API, and I think that site is one of the best things the AoE4 community has. I want this to sit next to AoE4World, not replace it.

The thing I want is a better answer than "you lost because you had less army." I want the report to help answer questions like:

- When did the military gap appear?
- Was the other player ahead economically?
- Did that economy become army, or sit as float?
- Were the big fights efficient or disastrous?
- Did villager losses or under-production quietly compound?
- Did one player invest in a future economy while the other invested in immediate pressure?

That is the shape of the tool.

## What I am looking at next

AoE4 is complicated, and some civilizations do not fit cleanly into a simple accounting model. Delhi is the clearest current example. Jeanne d'Arc and other civ-specific systems need more careful handling too. I am also checking whether newer or stranger mechanics, like Golden Horde villager production, create problems.

The next things I am thinking about are:

1. Adjusted military value that accounts for upgrades and counters.
2. Win probability, partly so the tool can find inflection points.
3. Better handling for civilizations with unusual mechanics.

I would especially like feedback on two things.

If you try it, please [DM me on Reddit](https://www.reddit.com/user/shoe7525/) with the match link or report URL, the timestamp you were looking at if relevant, what you expected to see, and what looked wrong or hard to understand.

First, modeling mistakes. I expect there are small but important issues I have not caught yet, especially around civilization mechanics. If a unit is in the wrong category, a civ mechanic is missing, a fight summary feels strange, or a resource value does not match the game, I want to hear about it.

Second, feature requests. If there is a chart, explanation, interaction, or game question this should handle, please suggest it.

I think this can become useful for people trying to understand why a game went the way it did, especially after a loss. The best way to improve it is for people to use it, find the confusing parts, and tell me where the model is wrong.
